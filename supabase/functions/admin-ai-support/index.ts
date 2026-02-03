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

// Filter sensitive columns - only return non-sensitive data
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
    is_balance_frozen: profile.is_balance_frozen,
    created_at: profile.created_at,
  };
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

    // Create Supabase client to verify admin role
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

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // 3. Fetch disputed transactions (as "Disputes")
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
      .select("user_id, full_name, suspicious_reason, suspicious_at, is_banned, ban_reason")
      .or("is_suspicious.eq.true,is_banned.eq.true")
      .limit(20);

    // ============ BUILD CONTEXT ============
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
  transactions.slice(0, 30).map((tx, i) => `
${i + 1}. [${tx.transaction_code}] - ${tx.status.toUpperCase()}
   - Số tiền: ${tx.amount?.toLocaleString('vi-VN')} VNĐ
   - Sản phẩm: ${tx.product_name}
   - Danh mục: ${tx.category || 'Khác'}
   - Phí: ${tx.platform_fee_amount?.toLocaleString('vi-VN')} VNĐ
   - Tạo: ${tx.created_at}
`).join('')}

⚠️ KHIẾU NẠI ĐANG XỬ LÝ (${disputes.length} vụ):
${disputes.length === 0 ? "Không có khiếu nại nào đang xử lý." :
  disputes.map((d, i) => `
${i + 1}. [${d.transaction_code}] - ${d.amount?.toLocaleString('vi-VN')} VNĐ
   - Lý do: ${d.dispute_reason || 'Chưa rõ'}
   - Khiếu nại lúc: ${d.dispute_at}
`).join('')}

👥 NGƯỜI DÙNG (${profiles.length} tài khoản):
- Tổng số dư hệ thống: ${profiles.reduce((sum, p) => sum + (p.balance || 0), 0).toLocaleString('vi-VN')} VNĐ
- Đã KYC: ${profiles.filter(p => p.kyc_status === 'approved').length}
- Chờ KYC: ${profiles.filter(p => p.kyc_status === 'pending').length}

🚨 CẢNH BÁO RỦI RO (${riskAlerts?.length || 0} cảnh báo chưa xử lý):
${!riskAlerts || riskAlerts.length === 0 ? "Không có cảnh báo rủi ro nào." :
  riskAlerts.slice(0, 10).map((alert, i) => `
${i + 1}. [${alert.alert_type}] - ${alert.description}
   - Tạo: ${alert.created_at}
`).join('')}

🔴 TÀI KHOẢN NGHI VẤN/BỊ KHÓA (${suspiciousUsers?.length || 0}):
${!suspiciousUsers || suspiciousUsers.length === 0 ? "Không có tài khoản nghi vấn." :
  suspiciousUsers.map((u, i) => `
${i + 1}. ${u.full_name || 'Chưa có tên'} (ID: ${u.user_id})
   - Bị ban: ${u.is_banned ? `Có - ${u.ban_reason}` : 'Không'}
   - Nghi vấn: ${u.suspicious_reason || 'Không'}
`).join('')}
`;

    // ============ SYSTEM INSTRUCTION ============
    const systemInstruction = `Bạn là **Giám đốc Vận hành** của hệ thống Giao dịch Trung gian (GDTG).

## VAI TRÒ VÀ TRÁCH NHIỆM:
- Phân tích dữ liệu giao dịch, phát hiện rủi ro lừa đảo
- Tóm tắt tình hình kinh doanh, doanh thu, xu hướng
- Đánh giá người dùng nghi vấn và đề xuất hành động
- Trả lời các câu hỏi của Admin về hoạt động hệ thống

## NGUYÊN TẮC BẮT BUỘC:
1. **CHỈ ĐỌC**: Bạn KHÔNG có quyền chỉnh sửa database. Chỉ phân tích và tư vấn.
2. **DỰA TRÊN DỮ LIỆU**: Mọi câu trả lời PHẢI dựa trên dữ liệu thực được cung cấp bên dưới. KHÔNG ĐƯỢC bịa đặt.
3. **NẾU KHÔNG CÓ DỮ LIỆU**: Báo rõ "Không có dữ liệu" hoặc "Chưa có giao dịch".
4. **BẢO MẬT**: Không tiết lộ thông tin nhạy cảm (mật khẩu, token, số tài khoản đầy đủ).

## CÁCH PHÂN TÍCH:
- Điểm uy tín < 30: Đáng ngờ, cần theo dõi
- Nhiều khiếu nại từ 1 user: Có thể là scammer hoặc khách hàng khó tính
- Giao dịch giá trị lớn (>10tr): Cần kiểm tra kỹ KYC
- Nạp-rút nhanh không giao dịch: Dấu hiệu rửa tiền
- Nhiều tài khoản dùng chung ngân hàng: Multi-account

## ĐỊNH DẠNG TRẢ LỜI:
- Sử dụng Markdown để định dạng rõ ràng
- Có thể dùng bảng khi so sánh số liệu
- Bullet points cho danh sách
- Bold cho thông tin quan trọng

${dataContext}`;

    // ============ CALL GROQ API ============
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert messages to OpenAI format (Groq uses OpenAI-compatible API)
    const groqMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    console.log("Calling Groq API with", groqMessages.length, "messages");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Fast & free model
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

    // Stream the response
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
