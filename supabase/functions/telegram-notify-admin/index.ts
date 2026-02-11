import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface NotifyRequest {
  type: "kyc" | "withdrawal" | "deposit" | "dispute" | "risk_alert" | "custom";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

async function getSettingFromDB(supabase: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .single();

  if (error || !data?.setting_value) return null;
  return data.setting_value;
}

async function getSecretFromDB(supabase: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("admin_secrets")
    .select("secret_value")
    .eq("secret_key", key)
    .single();

  if (error || !data?.secret_value) {
    return Deno.env.get(key) || null;
  }
  return data.secret_value;
}

function getEmoji(type: string): string {
  switch (type) {
    case "kyc": return "🪪";
    case "withdrawal": return "💸";
    case "deposit": return "💰";
    case "dispute": return "⚠️";
    case "risk_alert": return "🚨";
    default: return "📢";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "kyc": return "KYC";
    case "withdrawal": return "Rút tiền";
    case "deposit": return "Nạp tiền";
    case "dispute": return "Khiếu nại";
    case "risk_alert": return "Cảnh báo rủi ro";
    default: return "Thông báo";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if notifications are enabled
    const enabled = await getSettingFromDB(supabase, "telegram_notifications_enabled");
    if (enabled !== "true") {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Notifications disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin chat ID
    const chatId = await getSettingFromDB(supabase, "admin_telegram_chat_id");
    if (!chatId) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "No admin chat ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get bot token
    const botToken = await getSecretFromDB(supabase, "TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: NotifyRequest = await req.json();
    const emoji = getEmoji(body.type);
    const typeLabel = getTypeLabel(body.type);

    const text = `${emoji} <b>[${typeLabel}] ${body.title}</b>\n\n${body.message}`;

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const result = await tgResponse.json();
    console.log("Telegram notify result:", result);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notify error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
