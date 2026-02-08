import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-forwarded-for, x-real-ip, cf-connecting-ip",
};

const MAX_REQUESTS = 5;
const WINDOW_MINUTES = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get client IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    const clientIp = cfConnectingIp || (forwardedFor?.split(",")[0]?.trim()) || realIp || "unknown";

    console.log(`[create-transaction] Request from IP: ${clientIp}`);

    // Get authorization header for user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for rate limiting
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user client for authenticated operations
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-transaction] User: ${user.id}`);

    // Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_rate_limit",
      {
        p_ip: clientIp,
        p_action_type: "create_transaction",
        p_max_requests: MAX_REQUESTS,
        p_window_minutes: WINDOW_MINUTES,
      }
    );

    if (rateLimitError) {
      console.error("[create-transaction] Rate limit check error:", rateLimitError);
    }

    // If rate limit exceeded
    if (rateLimitCheck === false) {
      console.log(`[create-transaction] Rate limit exceeded for IP: ${clientIp}`);
      
      // Create risk alert
      await supabaseAdmin.from("risk_alerts").insert({
        user_id: user.id,
        alert_type: "rate_limit_exceeded",
        description: `IP ${clientIp} đã vượt quá giới hạn tạo phòng giao dịch (${MAX_REQUESTS} lần/${WINDOW_MINUTES} phút)`,
        metadata: {
          ip_address: clientIp,
          action_type: "create_transaction",
          limit: MAX_REQUESTS,
          window_minutes: WINDOW_MINUTES,
        },
      });

      return new Response(
        JSON.stringify({
          error: "RATE_LIMIT_EXCEEDED",
          message: `Bạn đã tạo quá nhiều phòng giao dịch. Vui lòng chờ ${WINDOW_MINUTES} phút trước khi thử lại.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      product_name,
      product_description,
      category,
      images,
      amount,
      platform_fee_percent,
      fee_bearer,
      dispute_time_hours,
      buyer_id,
      seller_id,
      moderator_id,
    } = body;

    // Validate required fields
    if (!product_name || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Thiếu thông tin bắt buộc" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action before creating
    await supabaseAdmin.rpc("log_rate_limit_action", {
      p_ip: clientIp,
      p_action_type: "create_transaction",
    });

    // Create the transaction
    const { data: transaction, error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        product_name,
        product_description: product_description || null,
        category: category || "other",
        images: images || [],
        amount,
        platform_fee_percent: platform_fee_percent || 0,
        fee_bearer: fee_bearer || "seller",
        dispute_time_hours: dispute_time_hours || 24,
        buyer_id: buyer_id || null,
        seller_id: seller_id || null,
        moderator_id: moderator_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[create-transaction] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-transaction] Created transaction: ${transaction.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[create-transaction] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
