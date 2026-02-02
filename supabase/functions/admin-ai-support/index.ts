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

    const { messages, query } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || "";

    // Use service role client to query data
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is asking about a specific transaction
    let transactionContext = "";
    const transactionMatch = userMessage.match(/(?:giao dịch|transaction|GD|id|ID|#)\s*[#:]?\s*([a-zA-Z0-9-]+)/i);
    
    if (transactionMatch) {
      const transactionId = transactionMatch[1];
      
      // Try to find by ID or transaction_code
      const { data: transaction } = await serviceClient
        .from("transactions")
        .select("*")
        .or(`id.eq.${transactionId},transaction_code.ilike.%${transactionId}%,room_id.eq.${transactionId}`)
        .limit(1)
        .single();

      if (transaction) {
        // Get buyer and seller profiles
        const [buyerResult, sellerResult] = await Promise.all([
          transaction.buyer_id 
            ? serviceClient.from("profiles").select("full_name, reputation_score, is_banned, is_suspicious, kyc_status").eq("user_id", transaction.buyer_id).single()
            : null,
          transaction.seller_id
            ? serviceClient.from("profiles").select("full_name, reputation_score, is_banned, is_suspicious, kyc_status").eq("user_id", transaction.seller_id).single()
            : null,
        ]);

        transactionContext = `
THÔNG TIN GIAO DỊCH TÌM THẤY:
- ID: ${transaction.id}
- Mã giao dịch: ${transaction.transaction_code}
- Room ID: ${transaction.room_id}
- Trạng thái: ${transaction.status}
- Số tiền: ${transaction.amount?.toLocaleString('vi-VN')} VNĐ
- Phí platform: ${transaction.platform_fee_amount?.toLocaleString('vi-VN')} VNĐ (${transaction.platform_fee_percent}%)
- Seller nhận: ${transaction.seller_receives?.toLocaleString('vi-VN')} VNĐ
- Sản phẩm: ${transaction.product_name}
- Mô tả: ${transaction.product_description || 'Không có'}
- Danh mục: ${transaction.category}
- Người chịu phí: ${transaction.fee_bearer}
- Thời gian khiếu nại: ${transaction.dispute_time_hours}h
- Lý do khiếu nại: ${transaction.dispute_reason || 'Không có'}
- Buyer đã xác nhận: ${transaction.buyer_confirmed ? 'Có' : 'Chưa'}
- Seller đã xác nhận: ${transaction.seller_confirmed ? 'Có' : 'Chưa'}
- Tạo lúc: ${transaction.created_at}
- Cập nhật: ${transaction.updated_at}
- Hoàn thành: ${transaction.completed_at || 'Chưa'}
- Đã cọc: ${transaction.deposited_at || 'Chưa'}
- Đang giao: ${transaction.shipped_at || 'Chưa'}
- Khiếu nại lúc: ${transaction.dispute_at || 'Không'}

THÔNG TIN NGƯỜI MUA:
${buyerResult?.data ? `
- Tên: ${buyerResult.data.full_name || 'Chưa cập nhật'}
- Điểm uy tín: ${buyerResult.data.reputation_score}
- Bị ban: ${buyerResult.data.is_banned ? 'Có' : 'Không'}
- Nghi vấn: ${buyerResult.data.is_suspicious ? 'Có' : 'Không'}
- KYC: ${buyerResult.data.kyc_status}
` : 'Chưa có buyer tham gia'}

THÔNG TIN NGƯỜI BÁN:
${sellerResult?.data ? `
- Tên: ${sellerResult.data.full_name || 'Chưa cập nhật'}
- Điểm uy tín: ${sellerResult.data.reputation_score}
- Bị ban: ${sellerResult.data.is_banned ? 'Có' : 'Không'}
- Nghi vấn: ${sellerResult.data.is_suspicious ? 'Có' : 'Không'}
- KYC: ${sellerResult.data.kyc_status}
` : 'Chưa có seller tham gia'}
`;
      } else {
        transactionContext = `Không tìm thấy giao dịch với ID/mã "${transactionId}".`;
      }
    }

    // Check if asking about banned/suspicious users
    let userContext = "";
    if (userMessage.match(/(?:khóa|ban|cấm|nghi vấn|suspicious)/i)) {
      const { data: bannedUsers } = await serviceClient
        .from("profiles")
        .select("user_id, full_name, is_banned, ban_reason, banned_at, is_suspicious, suspicious_reason, suspicious_at")
        .or("is_banned.eq.true,is_suspicious.eq.true")
        .limit(10);

      if (bannedUsers && bannedUsers.length > 0) {
        userContext = `
DANH SÁCH USER BỊ KHÓA/NGHI VẤN GẦN ĐÂY:
${bannedUsers.map((u, i) => `
${i + 1}. ${u.full_name || 'Chưa có tên'} (ID: ${u.user_id})
   - Bị ban: ${u.is_banned ? `Có - Lý do: ${u.ban_reason || 'Không rõ'} - Lúc: ${u.banned_at}` : 'Không'}
   - Nghi vấn: ${u.is_suspicious ? `Có - Lý do: ${u.suspicious_reason || 'Không rõ'} - Lúc: ${u.suspicious_at}` : 'Không'}
`).join('')}
`;
      }
    }

    // Check for cancelled/disputed transactions
    let cancelContext = "";
    if (userMessage.match(/(?:hủy|cancel|dispute|khiếu nại|refund|hoàn)/i)) {
      const { data: cancelledTx } = await serviceClient
        .from("transactions")
        .select("id, transaction_code, status, dispute_reason, updated_at, amount")
        .in("status", ["cancelled", "disputed", "refunded"])
        .order("updated_at", { ascending: false })
        .limit(5);

      if (cancelledTx && cancelledTx.length > 0) {
        cancelContext = `
GIAO DỊCH HỦY/KHIẾU NẠI GẦN ĐÂY:
${cancelledTx.map((t, i) => `
${i + 1}. ${t.transaction_code} - ${t.status.toUpperCase()}
   - Số tiền: ${t.amount?.toLocaleString('vi-VN')} VNĐ
   - Lý do: ${t.dispute_reason || 'Không có lý do'}
   - Cập nhật: ${t.updated_at}
`).join('')}
`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Bạn là AI hỗ trợ quản trị viên của nền tảng giao dịch trung gian GDTG. 
Vai trò của bạn:
- Phân tích giao dịch và phát hiện bất thường
- Tóm tắt lý do khóa tài khoản hoặc hủy giao dịch
- Hỗ trợ admin đưa ra quyết định
- Trả lời các câu hỏi về hoạt động của hệ thống
- Có thể nói chuyện thân thiện khi admin cần

Khi phân tích giao dịch, hãy chú ý:
- Điểm uy tín thấp (<30) là đáng ngờ
- User bị ban hoặc nghi vấn cần cảnh báo
- KYC chưa xác thực có thể là rủi ro
- Giao dịch số tiền lớn cần kiểm tra kỹ
- Thời gian giao dịch bất thường (quá nhanh hoặc quá chậm)
- Khiếu nại liên tục từ cùng một user

Trả lời bằng tiếng Việt, ngắn gọn và rõ ràng. Khi có dữ liệu, hãy phân tích chi tiết.

${transactionContext}
${userContext}
${cancelContext}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
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
