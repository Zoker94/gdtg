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
    const [profilesRes, depositsRes, withdrawalsRes, transactionsRes, actionLogsRes] = await Promise.all([
      serviceClient.from("profiles").select("*"),
      serviceClient.from("deposits").select("*").eq("status", "completed"),
      serviceClient.from("withdrawals").select("*").eq("status", "completed"),
      serviceClient.from("transactions").select("*"),
      serviceClient.from("admin_action_logs").select("*").eq("action_type", "balance_change").order("created_at", { ascending: false }).limit(100),
    ]);

    const profiles = profilesRes.data || [];
    const deposits = depositsRes.data || [];
    const withdrawals = withdrawalsRes.data || [];
    const transactions = transactionsRes.data || [];
    const actionLogs = actionLogsRes.data || [];

    console.log(`[Security Auto-Freeze] Loaded: ${profiles.length} profiles, ${deposits.length} deposits, ${withdrawals.length} withdrawals, ${transactions.length} transactions`);

    const anomalies: BalanceAnomaly[] = [];
    const frozenUsers: string[] = [];

    // Check each user for balance anomalies
    for (const profile of profiles) {
      // Skip already frozen accounts
      if (profile.is_balance_frozen) continue;

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
      
      // Expected balance = deposits - withdrawals - spent + received
      const expectedBalance = totalDeposited - totalWithdrawn - totalSpentAsBuyer + totalReceivedAsSeller;
      const actualBalance = profile.balance || 0;
      const difference = actualBalance - expectedBalance;

      let shouldFreeze = false;
      let freezeReason = "";

      // Check for balance inflation (difference > 100k VND)
      if (difference > 100000) {
        shouldFreeze = true;
        freezeReason = `[AUTO-FREEZE] Số dư bất thường: Thực ${actualBalance.toLocaleString()}đ > Kỳ vọng ${expectedBalance.toLocaleString()}đ (chênh +${difference.toLocaleString()}đ). Nghi ngờ exploit API.`;
        
        anomalies.push({
          userId: profile.user_id,
          userName: profile.full_name || 'Chưa đặt tên',
          issue: 'BALANCE_INFLATED',
          severity: difference > 1000000 ? 'high' : 'medium',
          details: freezeReason,
          actualBalance,
          expectedBalance,
        });
      }

      // Check for unexplained balance (has money but never deposited or sold)
      if (actualBalance > 500000 && totalDeposited === 0 && userTxAsSeller.length === 0) {
        shouldFreeze = true;
        freezeReason = `[AUTO-FREEZE] Số dư không giải thích được: ${actualBalance.toLocaleString()}đ nhưng chưa từng nạp tiền hay bán hàng.`;
        
        anomalies.push({
          userId: profile.user_id,
          userName: profile.full_name || 'Chưa đặt tên',
          issue: 'UNEXPLAINED_BALANCE',
          severity: 'high',
          details: freezeReason,
          actualBalance,
          expectedBalance: 0,
        });
      }

      // Freeze the account if anomaly detected
      if (shouldFreeze) {
        console.log(`[Security Auto-Freeze] Freezing account: ${profile.full_name} (${profile.user_id.slice(0, 8)}...) - ${freezeReason}`);
        
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
          console.error(`[Security Auto-Freeze] Failed to freeze ${profile.user_id}:`, freezeError);
        } else {
          frozenUsers.push(profile.full_name || profile.user_id.slice(0, 8));

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
            },
            note: "Tự động đóng băng bởi hệ thống bảo mật",
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
            },
          });
        }
      }
    }

    // Also check for suspicious balance_change logs with unknown source
    const unknownSourceChanges = actionLogs.filter(log => {
      const details = log.details as any;
      return details?.source === 'unknown';
    });

    // Group by user
    const suspiciousLogsByUser: Record<string, any[]> = {};
    for (const log of unknownSourceChanges) {
      const userId = log.target_user_id;
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
        const freezeReason = `[AUTO-FREEZE] Phát hiện ${logs.length} lần thay đổi số dư từ nguồn "unknown" với tổng ${totalSuspiciousChange > 0 ? '+' : ''}${totalSuspiciousChange.toLocaleString()}đ. Nghi ngờ exploit API.`;

        console.log(`[Security Auto-Freeze] Freezing account for suspicious logs: ${profile.full_name} (${userId.slice(0, 8)}...)`);

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
          frozenUsers.push(profile.full_name || userId.slice(0, 8));

          anomalies.push({
            userId,
            userName: profile.full_name || 'Chưa đặt tên',
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
              suspicious_changes: logs.length,
              total_suspicious_amount: totalSuspiciousChange,
            },
            note: "Tự động đóng băng bởi hệ thống bảo mật - phát hiện thay đổi từ nguồn unknown",
          });
        }
      }
    }

    const result = {
      success: true,
      scanned: profiles.length,
      anomaliesFound: anomalies.length,
      accountsFrozen: frozenUsers.length,
      frozenUsers,
      anomalies,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Security Auto-Freeze] Completed. Frozen ${frozenUsers.length} accounts.`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[Security Auto-Freeze] Error:", e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
