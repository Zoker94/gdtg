import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalanceAnomaly {
  userId: string;
  userName: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  actualBalance: number;
  expectedBalance: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[Security Auto-Freeze] Starting balance anomaly scan...");

    // Fetch all necessary data
    const [profilesRes, depositsRes, withdrawalsRes, transactionsRes, actionLogsRes, userRolesRes] = await Promise.all([
      serviceClient.from("profiles").select("*"),
      serviceClient.from("deposits").select("*").eq("status", "completed"),
      serviceClient.from("withdrawals").select("*").eq("status", "completed"),
      serviceClient.from("transactions").select("*"),
      serviceClient.from("admin_action_logs").select("*").order("created_at", { ascending: false }).limit(500),
      serviceClient.from("user_roles").select("user_id, role"),
    ]);

    const profiles = profilesRes.data || [];
    const deposits = depositsRes.data || [];
    const withdrawals = withdrawalsRes.data || [];
    const transactions = transactionsRes.data || [];
    const actionLogs = actionLogsRes.data || [];
    const userRoles = userRolesRes.data || [];

    // Get list of admin user IDs (admin, super_admin, moderator)
    const staffUserIds = new Set(
      userRoles
        .filter(r => ['admin', 'super_admin', 'moderator'].includes(r.role))
        .map(r => r.user_id)
    );

    console.log(`[Security Auto-Freeze] Found ${staffUserIds.size} staff accounts (will be skipped)`);
    console.log(`[Security Auto-Freeze] Loaded: ${profiles.length} profiles, ${deposits.length} deposits, ${withdrawals.length} withdrawals, ${transactions.length} transactions, ${actionLogs.length} action logs`);

    const anomalies: BalanceAnomaly[] = [];
    const frozenUsers: string[] = [];
    const skippedUsers: { name: string; reason: string }[] = [];

    // Group admin balance adjustments by user
    const adminAdjustmentsByUser: Record<string, number> = {};
    for (const log of actionLogs) {
      if (log.action_type === 'adjust_balance' || log.action_type === 'balance_change') {
        const details = log.details as any;
        // Only count legitimate admin adjustments (not from unknown source)
        if (details?.source === 'admin_manual' || log.action_type === 'adjust_balance') {
          const userId = log.target_user_id;
          const amount = details?.amount || details?.difference || 0;
          if (!adminAdjustmentsByUser[userId]) {
            adminAdjustmentsByUser[userId] = 0;
          }
          adminAdjustmentsByUser[userId] += Number(amount);
        }
      }
    }

    console.log(`[Security Auto-Freeze] Found admin adjustments for ${Object.keys(adminAdjustmentsByUser).length} users`);

    // Check each user for balance anomalies
    for (const profile of profiles) {
      const userName = profile.full_name || 'Chưa đặt tên';
      const userIdShort = profile.user_id.slice(0, 8);

      // Skip already frozen accounts
      if (profile.is_balance_frozen) {
        console.log(`[Security Auto-Freeze] Skipping ${userName} (${userIdShort}...): Already frozen`);
        continue;
      }

      // Skip staff accounts (admin, super_admin, moderator)
      if (staffUserIds.has(profile.user_id)) {
        console.log(`[Security Auto-Freeze] Skipping ${userName} (${userIdShort}...): Staff account`);
        skippedUsers.push({ name: userName, reason: 'Staff account (admin/moderator)' });
        continue;
      }

      const userDeposits = deposits.filter(d => d.user_id === profile.user_id);
      const userWithdrawals = withdrawals.filter(w => w.user_id === profile.user_id);
      const userTxAsBuyer = transactions.filter(t => t.buyer_id === profile.user_id);
      const userTxAsSeller = transactions.filter(t => t.seller_id === profile.user_id && t.status === 'completed');
      
      const totalDeposited = userDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const totalWithdrawn = userWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
      const totalSpentAsBuyer = userTxAsBuyer
        .filter(t => ['deposited', 'shipping', 'completed'].includes(t.status))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalReceivedAsSeller = userTxAsSeller.reduce((sum, t) => sum + Number(t.seller_receives || 0), 0);
      
      // Get legitimate admin adjustments for this user
      const adminAdjustment = adminAdjustmentsByUser[profile.user_id] || 0;
      
      // Expected balance = deposits - withdrawals - spent + received + admin_adjustments
      const expectedBalance = totalDeposited - totalWithdrawn - totalSpentAsBuyer + totalReceivedAsSeller + adminAdjustment;
      const actualBalance = profile.balance || 0;
      const difference = actualBalance - expectedBalance;

      let shouldFreeze = false;
      let freezeReason = "";

      // Check for balance inflation (difference > 100k VND)
      if (difference > 100000) {
        shouldFreeze = true;
        freezeReason = `[AUTO-FREEZE] Số dư bất thường: Thực ${actualBalance.toLocaleString()}đ > Kỳ vọng ${expectedBalance.toLocaleString()}đ (chênh +${difference.toLocaleString()}đ). Công thức: Nạp ${totalDeposited.toLocaleString()} - Rút ${totalWithdrawn.toLocaleString()} - Chi mua ${totalSpentAsBuyer.toLocaleString()} + Thu bán ${totalReceivedAsSeller.toLocaleString()} + Admin điều chỉnh ${adminAdjustment.toLocaleString()} = ${expectedBalance.toLocaleString()}đ. Nghi ngờ exploit API.`;
        
        anomalies.push({
          userId: profile.user_id,
          userName,
          issue: 'BALANCE_INFLATED',
          severity: difference > 1000000 ? 'high' : 'medium',
          details: freezeReason,
          actualBalance,
          expectedBalance,
        });
      }

      // Check for unexplained balance (has money but never deposited, sold, or received admin adjustment)
      if (!shouldFreeze && actualBalance > 500000 && totalDeposited === 0 && userTxAsSeller.length === 0 && adminAdjustment <= 0) {
        shouldFreeze = true;
        freezeReason = `[AUTO-FREEZE] Số dư không giải thích được: ${actualBalance.toLocaleString()}đ nhưng chưa từng nạp tiền, bán hàng, hay được admin cộng tiền.`;
        
        anomalies.push({
          userId: profile.user_id,
          userName,
          issue: 'UNEXPLAINED_BALANCE',
          severity: 'high',
          details: freezeReason,
          actualBalance,
          expectedBalance: 0,
        });
      }

      // Freeze the account if anomaly detected
      if (shouldFreeze) {
        console.log(`[Security Auto-Freeze] 🔒 FREEZING: ${userName} (${userIdShort}...)`);
        console.log(`[Security Auto-Freeze]   Reason: ${freezeReason}`);
        
        const { error: freezeError } = await serviceClient
          .from("profiles")
          .update({
            is_balance_frozen: true,
            balance_frozen_at: new Date().toISOString(),
            balance_freeze_reason: freezeReason,
            is_suspicious: true,
            suspicious_reason: freezeReason,
            suspicious_at: new Date().toISOString(),
          })
          .eq("user_id", profile.user_id);

        if (freezeError) {
          console.error(`[Security Auto-Freeze] ❌ Failed to freeze ${userName}:`, freezeError);
        } else {
          frozenUsers.push(userName);

          // Log the action
          await serviceClient.from("admin_action_logs").insert({
            admin_id: "00000000-0000-0000-0000-000000000000", // System action
            target_user_id: profile.user_id,
            action_type: "auto_freeze_balance",
            details: {
              reason: freezeReason,
              actual_balance: actualBalance,
              expected_balance: expectedBalance,
              difference: difference,
              calculation: {
                total_deposited: totalDeposited,
                total_withdrawn: totalWithdrawn,
                total_spent_as_buyer: totalSpentAsBuyer,
                total_received_as_seller: totalReceivedAsSeller,
                admin_adjustments: adminAdjustment,
              },
            },
            note: "Tự động đóng băng bởi hệ thống bảo mật - phát hiện số dư bất thường",
          });

          // Create risk alert
          await serviceClient.from("risk_alerts").insert({
            user_id: profile.user_id,
            alert_type: "balance_anomaly",
            description: freezeReason,
            metadata: {
              actual_balance: actualBalance,
              expected_balance: expectedBalance,
              difference: difference,
              auto_frozen: true,
              calculation: {
                total_deposited: totalDeposited,
                total_withdrawn: totalWithdrawn,
                total_spent_as_buyer: totalSpentAsBuyer,
                total_received_as_seller: totalReceivedAsSeller,
                admin_adjustments: adminAdjustment,
              },
            },
          });

          console.log(`[Security Auto-Freeze] ✅ Successfully frozen ${userName}`);
        }
      }
    }

    // Also check for suspicious balance_change logs with unknown source (excluding staff)
    const unknownSourceChanges = actionLogs.filter(log => {
      const details = log.details as any;
      return log.action_type === 'balance_change' && details?.source === 'unknown';
    });

    // Group by user
    const suspiciousLogsByUser: Record<string, any[]> = {};
    for (const log of unknownSourceChanges) {
      const userId = log.target_user_id;
      // Skip staff accounts
      if (staffUserIds.has(userId)) continue;
      
      if (!suspiciousLogsByUser[userId]) {
        suspiciousLogsByUser[userId] = [];
      }
      suspiciousLogsByUser[userId].push(log);
    }

    for (const [userId, logs] of Object.entries(suspiciousLogsByUser)) {
      const profile = profiles.find(p => p.user_id === userId);
      if (!profile || profile.is_balance_frozen) continue;

      const totalSuspiciousChange = logs.reduce((sum, log) => {
        const details = log.details as any;
        return sum + (details?.difference || 0);
      }, 0);

      if (totalSuspiciousChange !== 0) {
        const freezeReason = `[AUTO-FREEZE] Phát hiện ${logs.length} lần thay đổi số dư từ nguồn "unknown" với tổng ${totalSuspiciousChange > 0 ? '+' : ''}${totalSuspiciousChange.toLocaleString()}đ. Đây là dấu hiệu exploit API client-side.`;
        const userName = profile.full_name || 'Chưa đặt tên';

        console.log(`[Security Auto-Freeze] 🔒 FREEZING for suspicious logs: ${userName} (${userId.slice(0, 8)}...)`);
        console.log(`[Security Auto-Freeze]   Found ${logs.length} unknown source changes, total: ${totalSuspiciousChange.toLocaleString()}đ`);

        const { error: freezeError } = await serviceClient
          .from("profiles")
          .update({
            is_balance_frozen: true,
            balance_frozen_at: new Date().toISOString(),
            balance_freeze_reason: freezeReason,
            is_suspicious: true,
            suspicious_reason: freezeReason,
            suspicious_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (!freezeError) {
          frozenUsers.push(userName);

          anomalies.push({
            userId,
            userName,
            issue: 'SUSPICIOUS_BALANCE_CHANGE',
            severity: 'high',
            details: freezeReason,
            actualBalance: profile.balance || 0,
            expectedBalance: 0,
          });

          // Log the action
          await serviceClient.from("admin_action_logs").insert({
            admin_id: "00000000-0000-0000-0000-000000000000",
            target_user_id: userId,
            action_type: "auto_freeze_balance",
            details: {
              reason: freezeReason,
              suspicious_changes_count: logs.length,
              total_suspicious_amount: totalSuspiciousChange,
              suspicious_log_ids: logs.map(l => l.id),
            },
            note: "Tự động đóng băng bởi hệ thống bảo mật - phát hiện thay đổi balance từ nguồn unknown",
          });

          console.log(`[Security Auto-Freeze] ✅ Successfully frozen ${userName} for suspicious logs`);
        }
      }
    }

    const result = {
      success: true,
      scanned: profiles.length,
      staffSkipped: staffUserIds.size,
      anomaliesFound: anomalies.length,
      accountsFrozen: frozenUsers.length,
      frozenUsers,
      skippedUsers,
      anomalies,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Security Auto-Freeze] ========== SCAN COMPLETED ==========`);
    console.log(`[Security Auto-Freeze] Total profiles scanned: ${profiles.length}`);
    console.log(`[Security Auto-Freeze] Staff accounts skipped: ${staffUserIds.size}`);
    console.log(`[Security Auto-Freeze] Anomalies found: ${anomalies.length}`);
    console.log(`[Security Auto-Freeze] Accounts frozen: ${frozenUsers.length}`);
    if (frozenUsers.length > 0) {
      console.log(`[Security Auto-Freeze] Frozen users: ${frozenUsers.join(', ')}`);
    }
    console.log(`[Security Auto-Freeze] ====================================`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[Security Auto-Freeze] ❌ ERROR:", e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
