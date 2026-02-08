import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-forwarded-for, x-real-ip",
};

const MAX_ACCOUNTS_PER_IP = 3;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get client IP from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    
    // Priority: CF > Forwarded > Real > fallback
    let clientIp = cfConnectingIp || (forwardedFor?.split(",")[0]?.trim()) || realIp || "unknown";
    
    console.log(`[register-with-ip] Request from IP: ${clientIp}`);

    const { email, password, fullName, action } = await req.json();

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // For registration, check IP limit first
    if (action === "signup") {
      if (!email || !password || !fullName) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Count existing accounts with this IP
      const { count, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("registration_ip", clientIp);

      if (countError) {
        console.error("[register-with-ip] Error counting IPs:", countError);
      }

      const existingCount = count || 0;
      console.log(`[register-with-ip] Existing accounts from IP ${clientIp}: ${existingCount}`);

      // Block if already at max
      if (existingCount >= MAX_ACCOUNTS_PER_IP) {
        console.log(`[register-with-ip] IP limit exceeded for ${clientIp}`);
        return new Response(
          JSON.stringify({
            error: "IP_LIMIT_EXCEEDED",
            message: `Địa chỉ IP này đã đạt giới hạn tạo tài khoản (tối đa ${MAX_ACCOUNTS_PER_IP} tài khoản/IP)`,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Proceed with signup
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: fullName },
      });

      if (signUpError) {
        console.error("[register-with-ip] Signup error:", signUpError);
        return new Response(
          JSON.stringify({ error: signUpError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = signUpData.user?.id;

      if (userId) {
        // Update profile with registration IP
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ registration_ip: clientIp })
          .eq("user_id", userId);

        if (updateError) {
          console.error("[register-with-ip] Error updating IP:", updateError);
        }

        // Create risk alert if this is 2nd or 3rd account
        if (existingCount >= 1) {
          // Get existing accounts info
          const { data: existingAccounts } = await supabaseAdmin
            .from("profiles")
            .select("user_id, full_name, created_at")
            .eq("registration_ip", clientIp);

          await supabaseAdmin.from("risk_alerts").insert({
            user_id: userId,
            alert_type: "multiple_accounts_ip",
            description: `Phát hiện tài khoản thứ ${existingCount + 1} được tạo từ cùng địa chỉ IP`,
            metadata: {
              ip_address: clientIp,
              account_number: existingCount + 1,
              existing_accounts: existingAccounts,
            },
          });

          console.log(`[register-with-ip] Risk alert created for IP ${clientIp}, account #${existingCount + 1}`);
        }
      }

      // Sign in the user to get session
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[register-with-ip] Sign in after signup error:", signInError);
        // User created but couldn't sign in - return partial success
        return new Response(
          JSON.stringify({
            success: true,
            message: "Tài khoản đã được tạo. Vui lòng đăng nhập.",
            warning: existingCount >= 1 ? `Đây là tài khoản thứ ${existingCount + 1} từ IP này` : null,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: signInData.session,
          user: signInData.user,
          warning: existingCount >= 1 ? `Đây là tài khoản thứ ${existingCount + 1} từ IP này` : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For login, just record IP if not set
    if (action === "signin") {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Missing email or password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ error: signInError.message }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update IP if not set (for existing accounts before this feature)
      if (signInData.user) {
        await supabaseAdmin
          .from("profiles")
          .update({ registration_ip: clientIp })
          .eq("user_id", signInData.user.id)
          .is("registration_ip", null);
      }

      return new Response(
        JSON.stringify({
          success: true,
          session: signInData.session,
          user: signInData.user,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-with-ip] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
