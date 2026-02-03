import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ============ DATA SANITIZATION ============
function sanitizeTransaction(tx: any) {
  return {
    id: tx.id,
    transaction_code: tx.transaction_code,
    room_id: tx.room_id,
    status: tx.status,
    amount: tx.amount,
    product_name: tx.product_name,
    category: tx.category,
    platform_fee_percent: tx.platform_fee_percent,
    platform_fee_amount: tx.platform_fee_amount,
    seller_receives: tx.seller_receives,
    fee_bearer: tx.fee_bearer,
    buyer_confirmed: tx.buyer_confirmed,
    seller_confirmed: tx.seller_confirmed,
    dispute_reason: tx.dispute_reason,
    dispute_time_hours: tx.dispute_time_hours,
    created_at: tx.created_at,
    updated_at: tx.updated_at,
    deposited_at: tx.deposited_at,
    shipped_at: tx.shipped_at,
    completed_at: tx.completed_at,
    dispute_at: tx.dispute_at,
  };
}

function sanitizeProfile(profile: any) {
  return {
    user_id: profile.user_id,
    full_name: profile.full_name,
    reputation_score: profile.reputation_score,
    total_transactions: profile.total_transactions,
    balance: profile.balance,
    kyc_status: profile.kyc_status,
    is_banned: profile.is_banned,
    is_suspicious: profile.is_suspicious,
    suspicious_reason: profile.suspicious_reason,
    is_balance_frozen: profile.is_balance_frozen,
    balance_freeze_reason: profile.balance_freeze_reason,
    created_at: profile.created_at,
  };
}

// ============ FRAUD DETECTION RULES ============
function analyzeUserRisk(profile: any, transactions: any[], deposits: any[], withdrawals: any[]): string[] {
  const risks: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Rule 1: Low reputation with high balance
  if (profile.reputation_score < 30 && profile.balance > 5000000) {
    risks.push(`⚠️ Điểm uy tín thấp (${profile.reputation_score}) nhưng số dư cao (${profile.balance.toLocaleString()}đ)`);
  }
  
  // Rule 2: New account with large transactions
  const accountAge = Math.floor((now.getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
  if (accountAge < 7 && profile.balance > 10000000) {
    risks.push(`⚠️ Tài khoản mới (${accountAge} ngày) với số dư lớn`);
  }
  
  // Rule 3: High volume today
  const todayDeposits = deposits.filter(d => new Date(d.created_at) >= today);
  const todayWithdrawals = withdrawals.filter(w => new Date(w.created_at) >= today);
  const todayVolume = todayDeposits.reduce((s, d) => s + d.amount, 0) + todayWithdrawals.reduce((s, w) => s + w.amount, 0);
  if (todayVolume > 50000000) {
    risks.push(`🔴 Khối lượng giao dịch hôm nay vượt 50 triệu: ${todayVolume.toLocaleString()}đ`);
  }
  
  // Rule 4: Many disputes
  const userDisputes = transactions.filter(t => t.status === 'disputed');
  if (userDisputes.length >= 3) {
    risks.push(`🔴 Nhiều khiếu nại: ${userDisputes.length} vụ`);
  }
  
  return risks;
}

function detectMultiAccount(profiles: any[], linkedBanks: any[]): { bankNumber: string; users: string[] }[] {
  const bankToUsers: Record<string, string[]> = {};
  
  for (const bank of linkedBanks) {
    const key = bank.bank_account_number;
    if (!bankToUsers[key]) bankToUsers[key] = [];
    const profile = profiles.find(p => p.user_id === bank.user_id);
    bankToUsers[key].push(profile?.full_name || bank.user_id);
  }
  
  return Object.entries(bankToUsers)
    .filter(([_, users]) => users.length > 1)
    .map(([bankNumber, users]) => ({ bankNumber: bankNumber.slice(0, 4) + "***" + bankNumber.slice(-3), users }));
}

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

    // Use service role client to query data (READ ONLY)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ============ FETCH DATA FOR RAG CONTEXT ============
    
    // 1. Fetch recent transactions (sanitized)
    const { data: rawTransactions } = await serviceClient
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const transactions = (rawTransactions || []).map(sanitizeTransaction);

    // 2. Fetch profiles/users (sanitized)
    const { data: rawProfiles } = await serviceClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const profiles = (rawProfiles || []).map(sanitizeProfile);

    // 3. Fetch disputed transactions
    const { data: rawDisputes } = await serviceClient
      .from("transactions")
      .select("*")
      .eq("status", "disputed")
      .order("dispute_at", { ascending: false })
      .limit(50);

    const disputes = (rawDisputes || []).map(sanitizeTransaction);

    // 4. Today's statistics
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTransactions } = await serviceClient
      .from("transactions")
      .select("*")
      .gte("created_at", today);

    const todayStats = {
      total_count: todayTransactions?.length || 0,
      total_amount: todayTransactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0,
      completed_count: todayTransactions?.filter(tx => tx.status === 'completed').length || 0,
      disputed_count: todayTransactions?.filter(tx => tx.status === 'disputed').length || 0,
      pending_count: todayTransactions?.filter(tx => tx.status === 'pending').length || 0,
      total_fee: todayTransactions?.reduce((sum, tx) => sum + (tx.platform_fee_amount || 0), 0) || 0,
    };

    // 5. Risk alerts
    const { data: riskAlerts } = await serviceClient
      .from("risk_alerts")
      .select("*")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20);

    // 6. Suspicious users
    const { data: suspiciousUsers } = await serviceClient
      .from("profiles")
      .select("user_id, full_name, suspicious_reason, suspicious_at, is_banned, ban_reason, reputation_score, balance, total_transactions")
      .or("is_suspicious.eq.true,is_banned.eq.true")
      .limit(30);

    // 7. KYC pending
    const { data: pendingKYC } = await serviceClient
      .from("kyc_submissions")
      .select("id, user_id, full_name, id_number, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    // 8. Recent deposits & withdrawals for fraud detection
    const { data: recentDeposits } = await serviceClient
      .from("deposits")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: recentWithdrawals } = await serviceClient
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // 9. Linked bank accounts for multi-account detection
    const { data: linkedBanks } = await serviceClient
      .from("linked_bank_accounts")
      .select("user_id, bank_account_number, bank_name");

    // ============ AI-POWERED ANALYSIS ============
    const multiAccounts = detectMultiAccount(rawProfiles || [], linkedBanks || []);
    
    // Analyze suspicious patterns
    const suspiciousPatterns: string[] = [];
    for (const profile of (rawProfiles || []).slice(0, 20)) {
      const userTx = (rawTransactions || []).filter(t => t.buyer_id === profile.user_id || t.seller_id === profile.user_id);
      const userDeposits = (recentDeposits || []).filter(d => d.user_id === profile.user_id);
      const userWithdrawals = (recentWithdrawals || []).filter(w => w.user_id === profile.user_id);
      const risks = analyzeUserRisk(profile, userTx, userDeposits, userWithdrawals);
      if (risks.length > 0) {
        suspiciousPatterns.push(`**${profile.full_name || profile.user_id}**: ${risks.join("; ")}`);
      }
    }

    // ============ BUILD ENHANCED CONTEXT ============
    const dataContext = `
=== DỮ LIỆU HỆ THỐNG (CHỈ ĐỌC - KHÔNG ĐƯỢC CHỈNH SỬA) ===

📊 THỐNG KÊ HÔM NAY (${today}):
- Tổng giao dịch: ${todayStats.total_count}
- Tổng giá trị: ${todayStats.total_amount.toLocaleString('vi-VN')} VNĐ
- Hoàn thành: ${todayStats.completed_count}
- Khiếu nại: ${todayStats.disputed_count}
- Đang chờ: ${todayStats.pending_count}
- Phí platform thu được: ${todayStats.total_fee.toLocaleString('vi-VN')} VNĐ

📋 GIAO DỊCH GẦN ĐÂY (${transactions.length} giao dịch):
${transactions.length === 0 ? "Chưa có giao dịch nào trong hệ thống." : 
  transactions.slice(0, 20).map((tx, i) => `
${i + 1}. [${tx.transaction_code}] - ${tx.status.toUpperCase()}
   - Số tiền: ${tx.amount?.toLocaleString('vi-VN')} VNĐ | Phí: ${tx.platform_fee_amount?.toLocaleString('vi-VN')} VNĐ
   - Sản phẩm: ${tx.product_name} | Danh mục: ${tx.category || 'Khác'}
   - Tạo: ${tx.created_at}${tx.dispute_reason ? ` | Lý do dispute: ${tx.dispute_reason}` : ''}
`).join('')}

⚠️ KHIẾU NẠI ĐANG XỬ LÝ (${disputes.length} vụ):
${disputes.length === 0 ? "Không có khiếu nại nào đang xử lý." :
  disputes.map((d, i) => `
${i + 1}. [${d.transaction_code}] - ${d.amount?.toLocaleString('vi-VN')} VNĐ
   - Lý do: ${d.dispute_reason || 'Chưa rõ'}
   - Thời gian khiếu nại: ${d.dispute_time_hours}h
   - Khiếu nại lúc: ${d.dispute_at}
`).join('')}

🔴 PHÁT HIỆN BẤT THƯỜNG TỰ ĐỘNG:
${suspiciousPatterns.length === 0 ? "Không phát hiện bất thường nào." :
  suspiciousPatterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

🔗 PHÁT HIỆN MULTI-ACCOUNT (cùng số tài khoản ngân hàng):
${multiAccounts.length === 0 ? "Không phát hiện multi-account." :
  multiAccounts.map((m, i) => `${i + 1}. STK ${m.bankNumber}: ${m.users.join(", ")}`).join('\n')}

👥 NGƯỜI DÙNG (${profiles.length} tài khoản):
- Tổng số dư hệ thống: ${profiles.reduce((sum, p) => sum + (p.balance || 0), 0).toLocaleString('vi-VN')} VNĐ
- Đã KYC: ${profiles.filter(p => p.kyc_status === 'approved').length}
- Chờ KYC: ${profiles.filter(p => p.kyc_status === 'pending').length}
- Bị ban: ${profiles.filter(p => p.is_banned).length}
- Nghi vấn: ${profiles.filter(p => p.is_suspicious).length}

📝 KYC CHỜ DUYỆT (${pendingKYC?.length || 0}):
${!pendingKYC || pendingKYC.length === 0 ? "Không có KYC nào chờ duyệt." :
  pendingKYC.slice(0, 10).map((k, i) => `
${i + 1}. ${k.full_name} - CCCD: ${k.id_number?.slice(0, 4)}***${k.id_number?.slice(-3)}
   - Gửi lúc: ${k.created_at}
`).join('')}

🚨 CẢNH BÁO RỦI RO CHƯA XỬ LÝ (${riskAlerts?.length || 0}):
${!riskAlerts || riskAlerts.length === 0 ? "Không có cảnh báo rủi ro nào." :
  riskAlerts.slice(0, 15).map((alert, i) => `
${i + 1}. [${alert.alert_type}] - ${alert.description}
   - Tạo: ${alert.created_at}
`).join('')}

🔴 TÀI KHOẢN NGHI VẤN/BỊ KHÓA (${suspiciousUsers?.length || 0}):
${!suspiciousUsers || suspiciousUsers.length === 0 ? "Không có tài khoản nghi vấn." :
  suspiciousUsers.map((u, i) => `
${i + 1}. ${u.full_name || 'Chưa có tên'} 
   - Điểm uy tín: ${u.reputation_score} | Số dư: ${u.balance?.toLocaleString()}đ | GD: ${u.total_transactions}
   - Bị ban: ${u.is_banned ? `CÓ - ${u.ban_reason}` : 'Không'}
   - Nghi vấn: ${u.suspicious_reason || 'Không'}
`).join('')}
`;

    // ============ SYSTEM INSTRUCTION ============
    const systemInstruction = `Bạn là **Giám đốc Vận hành & An ninh** của hệ thống Giao dịch Trung gian (GDTG).

## VAI TRÒ VÀ TRÁCH NHIỆM:
- Phân tích dữ liệu giao dịch, phát hiện rủi ro lừa đảo và multi-account
- Đánh giá độ tin cậy KYC và người dùng mới
- Gợi ý hành động xử lý dispute và trường hợp nghi vấn
- Tóm tắt tình hình kinh doanh, doanh thu, xu hướng
- Cảnh báo bất thường tự động

## NGUYÊN TẮC BẮT BUỘC:
1. **CHỈ ĐỌC**: Bạn KHÔNG có quyền chỉnh sửa database, số dư, thông tin nhạy cảm. Chỉ phân tích và tư vấn.
2. **DỰA TRÊN DỮ LIỆU**: Mọi câu trả lời PHẢI dựa trên dữ liệu thực được cung cấp. KHÔNG ĐƯỢC bịa đặt.
3. **NẾU KHÔNG CÓ DỮ LIỆU**: Báo rõ "Không có dữ liệu" hoặc "Chưa có giao dịch".
4. **BẢO MẬT**: Không tiết lộ thông tin nhạy cảm (mật khẩu, token, số tài khoản đầy đủ).

## TIÊU CHÍ PHÁT HIỆN RỦI RO:
| Dấu hiệu | Mức độ | Hành động đề xuất |
|----------|--------|-------------------|
| Điểm uy tín < 30 | Cao | Giám sát chặt, yêu cầu KYC |
| Nhiều khiếu nại (≥3) | Cao | Cân nhắc ban, kiểm tra lịch sử |
| Giao dịch > 10tr & chưa KYC | Trung bình | Yêu cầu KYC trước khi tiếp tục |
| Nạp-rút nhanh không giao dịch | Rất cao | Đóng băng số dư, yêu cầu giải trình |
| Cùng STK ngân hàng nhiều tài khoản | Rất cao | Ban tất cả, điều tra |
| Tài khoản mới < 7 ngày, GD lớn | Trung bình | Giám sát, delay rút tiền |
| Khối lượng > 50tr/ngày | Cao | Kiểm tra nguồn tiền |

## HƯỚNG DẪN XỬ LÝ DISPUTE:
1. Xem xét bằng chứng chat trong phòng giao dịch
2. Kiểm tra lịch sử 2 bên (điểm uy tín, số GD hoàn thành)
3. Ưu tiên bên có bằng chứng rõ ràng
4. Nếu không rõ ràng, đề xuất chia tiền hoặc hoàn tiền có điều kiện

## ĐÁNH GIÁ KYC:
- Kiểm tra ảnh CCCD rõ nét, không bị cắt xén
- So khớp tên với tên đăng ký
- Ngày sinh hợp lệ (> 18 tuổi)
- Nếu nghi ngờ: yêu cầu chụp lại hoặc video call xác minh

## ĐỊNH DẠNG TRẢ LỜI:
- Sử dụng Markdown rõ ràng (bảng, bullet, bold)
- Luôn đưa ra **Đề xuất hành động** cụ thể
- Emoji cho các mức độ: 🟢 An toàn, 🟡 Cần chú ý, 🔴 Nguy hiểm

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

    console.log(`[AI Support] User: ${userId}, Role: ${userRole}, Messages: ${groqMessages.length}`);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.7,
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
      
      return new Response(JSON.stringify({ error: "Groq API error" }), {
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
