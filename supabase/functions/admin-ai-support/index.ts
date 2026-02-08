import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client to verify admin/moderator role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check if user is admin or moderator
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator", "super_admin"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin/Moderator access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userRole = roleData[0].role;
    const { messages } = await req.json();

    // Use service role client for full database access (READ ONLY)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[AI Support] Fetching database data...");

    // ============ FETCH ALL DATA WITH FULL DETAILS ============
    
    // 1. ALL Transactions (full data)
    const { data: allTransactions, error: txError } = await serviceClient
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (txError) console.error("Error fetching transactions:", txError);
    const transactions = allTransactions || [];

    // 2. ALL Profiles (full data)
    const { data: allProfiles, error: profileError } = await serviceClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (profileError) console.error("Error fetching profiles:", profileError);
    const profiles = allProfiles || [];

    // 3. ALL Risk alerts
    const { data: allRiskAlerts, error: riskError } = await serviceClient
      .from("risk_alerts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (riskError) console.error("Error fetching risk_alerts:", riskError);
    const riskAlerts = allRiskAlerts || [];

    // 4. ALL Deposits
    const { data: allDeposits, error: depositError } = await serviceClient
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (depositError) console.error("Error fetching deposits:", depositError);
    const deposits = allDeposits || [];

    // 5. ALL Withdrawals
    const { data: allWithdrawals, error: withdrawalError } = await serviceClient
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (withdrawalError) console.error("Error fetching withdrawals:", withdrawalError);
    const withdrawals = allWithdrawals || [];

    // 6. ALL KYC submissions
    const { data: allKYC, error: kycError } = await serviceClient
      .from("kyc_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (kycError) console.error("Error fetching kyc_submissions:", kycError);
    const kycSubmissions = allKYC || [];

    // 7. ALL Linked bank accounts
    const { data: allBanks, error: bankError } = await serviceClient
      .from("linked_bank_accounts")
      .select("*");
    
    if (bankError) console.error("Error fetching linked_bank_accounts:", bankError);
    const linkedBanks = allBanks || [];

    // 8. Admin action logs (last 100 for better analysis)
    const { data: actionLogs, error: logError } = await serviceClient
      .from("admin_action_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (logError) console.error("Error fetching admin_action_logs:", logError);

    console.log(`[AI Support] Data loaded: ${transactions.length} transactions, ${profiles.length} profiles, ${riskAlerts.length} risk alerts, ${deposits.length} deposits, ${withdrawals.length} withdrawals, ${kycSubmissions.length} KYC, ${linkedBanks.length} banks`);

    // ============ SECURITY ANALYSIS: Detect Balance Anomalies ============
    const balanceAnomalies: Array<{
      userId: string;
      userName: string;
      issue: string;
      severity: 'high' | 'medium' | 'low';
      details: string;
    }> = [];

    // Check each user for balance anomalies
    for (const profile of profiles) {
      const userDeposits = deposits.filter(d => d.user_id === profile.user_id && d.status === 'completed');
      const userWithdrawals = withdrawals.filter(w => w.user_id === profile.user_id && w.status === 'completed');
      const userTxAsBuyer = transactions.filter(t => t.buyer_id === profile.user_id);
      const userTxAsSeller = transactions.filter(t => t.seller_id === profile.user_id && t.status === 'completed');
      
      const totalDeposited = userDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const totalWithdrawn = userWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
      const totalSpentAsBuyer = userTxAsBuyer.filter(t => t.status === 'deposited' || t.status === 'shipping' || t.status === 'completed').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalReceivedAsSeller = userTxAsSeller.reduce((sum, t) => sum + Number(t.seller_receives || 0), 0);
      
      // Expected balance = deposits - withdrawals - spent + received
      const expectedBalance = totalDeposited - totalWithdrawn - totalSpentAsBuyer + totalReceivedAsSeller;
      const actualBalance = profile.balance || 0;
      const difference = actualBalance - expectedBalance;
      
      // Check for balance manipulation (difference > 100k VND is suspicious)
      if (Math.abs(difference) > 100000) {
        balanceAnomalies.push({
          userId: profile.user_id,
          userName: profile.full_name || 'Chưa đặt tên',
          issue: difference > 0 ? 'BALANCE_INFLATED' : 'BALANCE_DEFLATED',
          severity: Math.abs(difference) > 1000000 ? 'high' : 'medium',
          details: `Số dư thực: ${actualBalance.toLocaleString()}đ, Số dư kỳ vọng: ${expectedBalance.toLocaleString()}đ, Chênh lệch: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}đ (Nạp: ${totalDeposited.toLocaleString()}, Rút: ${totalWithdrawn.toLocaleString()}, Chi mua: ${totalSpentAsBuyer.toLocaleString()}, Thu bán: ${totalReceivedAsSeller.toLocaleString()})`
        });
      }
      
      // Check for suspicious high balance without deposits
      if (actualBalance > 500000 && totalDeposited === 0 && userTxAsSeller.length === 0) {
        balanceAnomalies.push({
          userId: profile.user_id,
          userName: profile.full_name || 'Chưa đặt tên',
          issue: 'UNEXPLAINED_BALANCE',
          severity: 'high',
          details: `Có ${actualBalance.toLocaleString()}đ nhưng chưa từng nạp tiền hay bán hàng`
        });
      }
    }

    // Analyze balance_change logs for suspicious patterns
    const balanceChangeLogs = (actionLogs || []).filter(log => log.action_type === 'balance_change');
    const unknownSourceChanges = balanceChangeLogs.filter(log => {
      const details = log.details as any;
      return details?.source === 'unknown';
    });
    
    // Group suspicious changes by user
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
      const totalSuspiciousChange = logs.reduce((sum, log) => {
        const details = log.details as any;
        return sum + (details?.difference || 0);
      }, 0);
      
      if (totalSuspiciousChange !== 0) {
        balanceAnomalies.push({
          userId,
          userName: profile?.full_name || 'Chưa đặt tên',
          issue: 'SUSPICIOUS_BALANCE_CHANGE',
          severity: 'high',
          details: `Có ${logs.length} lần thay đổi số dư từ nguồn "unknown" với tổng ${totalSuspiciousChange > 0 ? '+' : ''}${totalSuspiciousChange.toLocaleString()}đ`
        });
      }
    }

    // ============ CALCULATE STATISTICS ============
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayStart = new Date(today);
    
    // Today's transactions
    const todayTx = transactions.filter(tx => new Date(tx.created_at) >= todayStart);
    
    // Transaction statistics by status
    const txStats = {
      total: transactions.length,
      pending: transactions.filter(tx => tx.status === 'pending').length,
      deposited: transactions.filter(tx => tx.status === 'deposited').length,
      shipping: transactions.filter(tx => tx.status === 'shipping').length,
      completed: transactions.filter(tx => tx.status === 'completed').length,
      disputed: transactions.filter(tx => tx.status === 'disputed').length,
      cancelled: transactions.filter(tx => tx.status === 'cancelled').length,
      refunded: transactions.filter(tx => tx.status === 'refunded').length,
    };

    // User statistics
    const userStats = {
      total: profiles.length,
      banned: profiles.filter(p => p.is_banned).length,
      suspicious: profiles.filter(p => p.is_suspicious).length,
      frozen: profiles.filter(p => p.is_balance_frozen).length,
      kycApproved: profiles.filter(p => p.kyc_status === 'approved').length,
      kycPending: profiles.filter(p => p.kyc_status === 'pending').length,
      kycRejected: profiles.filter(p => p.kyc_status === 'rejected').length,
      totalBalance: profiles.reduce((sum, p) => sum + (p.balance || 0), 0),
    };

    // Deposit statistics
    const depositStats = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending').length,
      completed: deposits.filter(d => d.status === 'completed').length,
      totalAmount: deposits.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.amount || 0), 0),
    };

    // Withdrawal statistics
    const withdrawalStats = {
      total: withdrawals.length,
      pending: withdrawals.filter(w => w.status === 'pending').length,
      onHold: withdrawals.filter(w => w.status === 'on_hold').length,
      completed: withdrawals.filter(w => w.status === 'completed').length,
      rejected: withdrawals.filter(w => w.status === 'rejected').length,
      totalAmount: withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + (w.amount || 0), 0),
    };

    // Multi-account detection (same bank account number)
    const bankToUsers: Record<string, { bank: string; users: string[] }> = {};
    for (const bank of linkedBanks) {
      const key = bank.bank_account_number;
      if (!bankToUsers[key]) {
        bankToUsers[key] = { bank: bank.bank_name, users: [] };
      }
      const profile = profiles.find(p => p.user_id === bank.user_id);
      bankToUsers[key].users.push(profile?.full_name || bank.user_id.slice(0, 8));
    }
    const multiAccounts = Object.entries(bankToUsers)
      .filter(([_, data]) => data.users.length > 1)
      .map(([num, data]) => ({
        bankNumber: num.slice(0, 4) + "***" + num.slice(-3),
        bankName: data.bank,
        users: data.users,
      }));

    // Revenue calculation
    const completedTx = transactions.filter(tx => tx.status === 'completed');
    const totalRevenue = completedTx.reduce((sum, tx) => sum + (tx.platform_fee_amount || 0), 0);
    const totalVolume = completedTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // ============ BUILD COMPREHENSIVE DATA CONTEXT ============
    const dataContext = `
=== DỮ LIỆU HỆ THỐNG THỰC TẾ (${now.toISOString()}) ===
=== LƯU Ý: ĐÂY LÀ DỮ LIỆU THỰC 100% TỪ DATABASE ===

📊 TỔNG QUAN HỆ THỐNG:
┌─────────────────────────────────────────────────────────┐
│ GIAO DỊCH                                               │
│ • Tổng số: ${txStats.total}                             │
│ • Pending: ${txStats.pending} | Deposited: ${txStats.deposited} | Shipping: ${txStats.shipping} │
│ • Completed: ${txStats.completed} | Disputed: ${txStats.disputed}    │
│ • Cancelled: ${txStats.cancelled} | Refunded: ${txStats.refunded}    │
│ • Doanh thu (phí sàn): ${totalRevenue.toLocaleString()} VNĐ         │
│ • Tổng giá trị GD hoàn thành: ${totalVolume.toLocaleString()} VNĐ   │
├─────────────────────────────────────────────────────────┤
│ NGƯỜI DÙNG (${userStats.total} tài khoản)               │
│ • Bị ban: ${userStats.banned} | Nghi vấn: ${userStats.suspicious} | Đóng băng: ${userStats.frozen} │
│ • KYC approved: ${userStats.kycApproved} | pending: ${userStats.kycPending} | rejected: ${userStats.kycRejected} │
│ • Tổng số dư hệ thống: ${userStats.totalBalance.toLocaleString()} VNĐ │
├─────────────────────────────────────────────────────────┤
│ NẠP TIỀN (${depositStats.total})                        │
│ • Chờ xác nhận: ${depositStats.pending} | Đã xác nhận: ${depositStats.completed} │
│ • Tổng đã nạp: ${depositStats.totalAmount.toLocaleString()} VNĐ      │
├─────────────────────────────────────────────────────────┤
│ RÚT TIỀN (${withdrawalStats.total})                     │
│ • Chờ xử lý: ${withdrawalStats.pending} | Tạm giữ: ${withdrawalStats.onHold} │
│ • Đã duyệt: ${withdrawalStats.completed} | Từ chối: ${withdrawalStats.rejected} │
│ • Tổng đã rút: ${withdrawalStats.totalAmount.toLocaleString()} VNĐ   │
├─────────────────────────────────────────────────────────┤
│ CẢNH BÁO RỦI RO                                         │
│ • Tổng: ${riskAlerts.length} | Chưa xử lý: ${riskAlerts.filter(r => !r.is_resolved).length} │
└─────────────────────────────────────────────────────────┘

📋 CHI TIẾT GIAO DỊCH (${transactions.length} giao dịch):
${transactions.length === 0 ? "❌ CHƯA CÓ GIAO DỊCH NÀO TRONG HỆ THỐNG." : 
  transactions.map((tx, i) => `
${i + 1}. [${tx.transaction_code}] - Trạng thái: ${tx.status.toUpperCase()}
   • Số tiền: ${(tx.amount || 0).toLocaleString()} VNĐ | Phí sàn: ${(tx.platform_fee_amount || 0).toLocaleString()} VNĐ
   • Sản phẩm: ${tx.product_name} | Danh mục: ${tx.category || 'other'}
   • Người mua: ${tx.buyer_id ? tx.buyer_id.slice(0, 8) + '...' : 'Chưa có'}
   • Người bán: ${tx.seller_id ? tx.seller_id.slice(0, 8) + '...' : 'Chưa có'}
   • Tạo lúc: ${tx.created_at}
   ${tx.dispute_reason ? `• LÝ DO KHIẾU NẠI: ${tx.dispute_reason}` : ''}
   ${tx.dispute_at ? `• Khiếu nại lúc: ${tx.dispute_at}` : ''}`).join('\n')}

👥 CHI TIẾT NGƯỜI DÙNG (${profiles.length} tài khoản):
${profiles.map((p, i) => `
${i + 1}. ${p.full_name || 'Chưa đặt tên'} (ID: ${p.user_id.slice(0, 8)}...)
   • Số dư: ${(p.balance || 0).toLocaleString()} VNĐ | Điểm uy tín: ${p.reputation_score}/100
   • Số giao dịch: ${p.total_transactions} | KYC: ${p.kyc_status}
   • Trạng thái: ${p.is_banned ? '🔴 BỊ BAN' : p.is_suspicious ? '🟡 NGHI VẤN' : p.is_balance_frozen ? '🔵 ĐÓNG BĂNG SỐ DƯ' : '🟢 Bình thường'}
   ${p.ban_reason ? `• Lý do ban: ${p.ban_reason}` : ''}
   ${p.suspicious_reason ? `• Lý do nghi vấn: ${p.suspicious_reason}` : ''}
   ${p.balance_freeze_reason ? `• Lý do đóng băng: ${p.balance_freeze_reason}` : ''}
   • Tạo tài khoản: ${p.created_at}`).join('\n')}

🚨 CẢNH BÁO RỦI RO (${riskAlerts.length}):
${riskAlerts.length === 0 ? "✅ KHÔNG CÓ CẢNH BÁO RỦI RO NÀO TRONG HỆ THỐNG." :
  riskAlerts.map((alert, i) => `
${i + 1}. [${alert.alert_type}] - ${alert.is_resolved ? '✅ Đã xử lý' : '⚠️ CHƯA XỬ LÝ'}
   • Mô tả: ${alert.description}
   • User ID: ${alert.user_id.slice(0, 8)}...
   • Tạo lúc: ${alert.created_at}
   ${alert.resolution_note ? `• Ghi chú xử lý: ${alert.resolution_note}` : ''}`).join('\n')}

🔗 PHÁT HIỆN MULTI-ACCOUNT (cùng số tài khoản ngân hàng):
${multiAccounts.length === 0 ? "✅ KHÔNG PHÁT HIỆN MULTI-ACCOUNT." :
  multiAccounts.map((m, i) => `
${i + 1}. 🔴 STK ${m.bankNumber} (${m.bankName})
   • Các tài khoản sử dụng chung: ${m.users.join(", ")}`).join('\n')}

💰 NẠP TIỀN CHỜ XÁC NHẬN (${deposits.filter(d => d.status === 'pending').length}):
${deposits.filter(d => d.status === 'pending').length === 0 ? "✅ KHÔNG CÓ LỆNH NẠP TIỀN CHỜ XÁC NHẬN." :
  deposits.filter(d => d.status === 'pending').map((d, i) => `
${i + 1}. ${(d.amount || 0).toLocaleString()} VNĐ - User: ${d.user_id.slice(0, 8)}...
   • Phương thức: ${d.payment_method} | Tạo: ${d.created_at}`).join('\n')}

💸 RÚT TIỀN CHỜ XỬ LÝ (${withdrawals.filter(w => w.status === 'pending' || w.status === 'on_hold').length}):
${withdrawals.filter(w => w.status === 'pending' || w.status === 'on_hold').length === 0 ? "✅ KHÔNG CÓ LỆNH RÚT TIỀN CHỜ XỬ LÝ." :
  withdrawals.filter(w => w.status === 'pending' || w.status === 'on_hold').map((w, i) => `
${i + 1}. ${(w.amount || 0).toLocaleString()} VNĐ - Trạng thái: ${w.status.toUpperCase()}
   • Ngân hàng: ${w.bank_name} - ${w.bank_account_name}
   • STK: ${w.bank_account_number}
   • User: ${w.user_id.slice(0, 8)}... | Tạo: ${w.created_at}
   ${w.admin_note ? `• Ghi chú Admin: ${w.admin_note}` : ''}`).join('\n')}

📝 KYC CHỜ DUYỆT (${kycSubmissions.filter(k => k.status === 'pending').length}):
${kycSubmissions.filter(k => k.status === 'pending').length === 0 ? "✅ KHÔNG CÓ KYC CHỜ DUYỆT." :
  kycSubmissions.filter(k => k.status === 'pending').map((k, i) => `
${i + 1}. ${k.full_name} - CCCD: ${k.id_number}
   • Ngày sinh: ${k.date_of_birth || 'Không có'}
   • User: ${k.user_id.slice(0, 8)}... | Gửi: ${k.created_at}`).join('\n')}

🔐 PHÁT HIỆN BẤT THƯỜNG SỐ DƯ (${balanceAnomalies.length}):
${balanceAnomalies.length === 0 ? "✅ KHÔNG PHÁT HIỆN BẤT THƯỜNG SỐ DƯ NÀO." :
  balanceAnomalies.map((a, i) => `
${i + 1}. ${a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '🟢'} [${a.issue}] - ${a.userName} (${a.userId.slice(0, 8)}...)
   • Chi tiết: ${a.details}`).join('\n')}

📜 HOẠT ĐỘNG ADMIN GẦN ĐÂY (${actionLogs?.length || 0}):
${!actionLogs || actionLogs.length === 0 ? "Chưa có hoạt động admin nào được ghi nhận." :
  actionLogs.slice(0, 15).map((log, i) => `
${i + 1}. [${log.action_type}] - Admin: ${log.admin_id.slice(0, 8)}...
   • Target: ${log.target_user_id.slice(0, 8)}...
   • Thời gian: ${log.created_at}
   ${log.details ? `• Chi tiết: ${JSON.stringify(log.details)}` : ''}
   ${log.note ? `• Ghi chú: ${log.note}` : ''}`).join('\n')}
`;

    // ============ ENHANCED SYSTEM INSTRUCTION ============
    const systemInstruction = `Bạn là **AI An ninh & Phân tích** của hệ thống Giao dịch Trung gian (GDTG).

## NGUYÊN TẮC QUAN TRỌNG NHẤT:
1. **BẮT BUỘC TRẢ LỜI ĐÚNG 100%**: Mọi con số, thống kê PHẢI lấy từ dữ liệu được cung cấp bên dưới.
2. **KHÔNG ĐƯỢC BỊA ĐẶT**: Nếu dữ liệu không có, phải nói rõ "Không có dữ liệu" hoặc "Hệ thống chưa có...".
3. **CHỈ ĐỌC**: Bạn KHÔNG có quyền chỉnh sửa gì cả, chỉ phân tích và báo cáo.
4. **TRÍCH DẪN NGUỒN**: Khi đưa ra con số, hãy cho biết nguồn (ví dụ: "Theo dữ liệu transactions: có 5 giao dịch")

## VAI TRÒ:
- Phân tích giao dịch đáng ngờ, phát hiện lừa đảo
- Phát hiện multi-account (cùng số tài khoản ngân hàng)
- **PHÁT HIỆN BALANCE MANIPULATION** (số dư bất thường)
- Đánh giá rủi ro người dùng
- Gợi ý xử lý dispute
- Tóm tắt thống kê, doanh thu

## TIÊU CHÍ PHÁT HIỆN RỦI RO:
| Dấu hiệu | Mức độ | Hành động đề xuất |
|----------|--------|-------------------|
| **BALANCE_INFLATED**: Số dư thực > số dư kỳ vọng | 🔴 RẤT CAO | Ban ngay, reset về 0, điều tra |
| **UNEXPLAINED_BALANCE**: Có tiền mà chưa nạp/bán | 🔴 RẤT CAO | Đóng băng, yêu cầu giải trình |
| **SUSPICIOUS_BALANCE_CHANGE**: Thay đổi từ nguồn unknown | 🔴 RẤT CAO | Điều tra ngay, có thể bị exploit |
| Cùng STK ngân hàng nhiều tài khoản | 🔴 RẤT CAO | Ban tất cả, điều tra |
| Điểm uy tín < 30 | 🔴 CAO | Giám sát chặt, yêu cầu KYC |
| Nạp-rút nhanh không giao dịch | 🔴 CAO | Đóng băng số dư |
| Nhiều khiếu nại (≥3) | 🟡 TRUNG BÌNH | Kiểm tra lịch sử |
| Tài khoản mới < 7 ngày, GD lớn | 🟡 TRUNG BÌNH | Giám sát |
| Chưa KYC nhưng GD > 5 triệu | 🟡 TRUNG BÌNH | Yêu cầu KYC |

## GIẢI THÍCH BALANCE ANOMALY:
- **Số dư kỳ vọng** = Tổng nạp - Tổng rút - Tổng chi mua hàng + Tổng thu bán hàng
- Nếu **số dư thực > số dư kỳ vọng**: User có thể đã exploit API để tự cộng tiền
- Nếu có log "balance_change" với source="unknown": User đã dùng Supabase client API để sửa balance trực tiếp

## ĐỊNH DẠNG TRẢ LỜI:
- Sử dụng Markdown (bảng, bullet, bold)
- Luôn có **Tóm tắt** ngắn gọn ở đầu
- Đưa ra **Đề xuất hành động** cụ thể khi phát hiện vấn đề
- Dùng emoji cho mức độ: 🟢 An toàn, 🟡 Cần chú ý, 🔴 Nguy hiểm

${dataContext}`;

    // ============ CALL GROQ API ============
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    console.log(`[AI Support] User: ${userId}, Role: ${userRole}, Messages: ${groqMessages.length}, Context size: ${systemInstruction.length} chars`);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.3, // Lower temperature for more accurate responses
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Groq API đã hết quota. Vui lòng chờ vài phút và thử lại." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Groq API error: " + errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("admin-ai-support error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
