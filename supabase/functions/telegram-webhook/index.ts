import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
    contact?: {
      phone_number: string;
      user_id?: number;
    };
  };
}

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: object) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  console.log("Telegram sendMessage result:", result);
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const update: TelegramUpdate = await req.json();
    console.log("Received Telegram update:", JSON.stringify(update, null, 2));

    const message = update.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;

    // Handle /start command with USER_ID
    if (message.text?.startsWith("/start")) {
      const parts = message.text.split(" ");
      const userId = parts[1];

      if (!userId) {
        await sendTelegramMessage(
          chatId,
          "❌ <b>Lỗi:</b> Thiếu mã người dùng.\n\nVui lòng quét mã QR từ website GDTG để xác thực."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, is_verified, phone_number")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("Profile lookup error:", profileError);
        await sendTelegramMessage(
          chatId,
          "❌ <b>Lỗi:</b> Không tìm thấy tài khoản với mã này.\n\nVui lòng kiểm tra lại hoặc liên hệ hỗ trợ."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.is_verified) {
        await sendTelegramMessage(
          chatId,
          `✅ <b>Tài khoản đã được xác thực!</b>\n\nSố điện thoại: ${profile.phone_number}\n\nBạn có thể quay lại website.`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save chatId and userId for later verification
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId.toString() })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error saving chat ID:", updateError);
      }

      // Send welcome message with contact button
      await sendTelegramMessage(
        chatId,
        `👋 <b>Xin chào ${profile.full_name || "bạn"}!</b>\n\n` +
        `Bạn đang xác thực tài khoản GDTG.\n\n` +
        `📱 Nhấn nút bên dưới để chia sẻ số điện thoại và hoàn tất xác thực.`,
        {
          keyboard: [
            [
              {
                text: "📱 Xác thực số điện thoại",
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle contact received
    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      const telegramUserId = message.from?.id;

      console.log("Contact received:", { phoneNumber, telegramUserId, chatId });

      // Find profile by telegram_chat_id
      const { data: profile, error: findError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name")
        .eq("telegram_chat_id", chatId.toString())
        .maybeSingle();

      if (findError || !profile) {
        console.error("Profile not found for chat:", findError);
        await sendTelegramMessage(
          chatId,
          "❌ <b>Lỗi:</b> Không tìm thấy phiên xác thực.\n\nVui lòng quét lại mã QR từ website."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize phone number (remove + if present, ensure starts with country code)
      let normalizedPhone = phoneNumber.replace(/\D/g, "");
      if (normalizedPhone.startsWith("84")) {
        normalizedPhone = "0" + normalizedPhone.slice(2);
      }

      // Check if phone is already used by another account
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("phone_number", normalizedPhone)
        .neq("user_id", profile.user_id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing phone:", checkError);
      }

      if (existingProfile) {
        await sendTelegramMessage(
          chatId,
          "❌ <b>Lỗi:</b> Số điện thoại này đã tồn tại trên hệ thống.\n\n" +
          "Mỗi số điện thoại chỉ có thể xác thực cho một tài khoản.\n\n" +
          "Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ hỗ trợ.",
          {
            remove_keyboard: true,
          }
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile with phone number and set is_verified to true
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone_number: normalizedPhone,
          is_verified: true,
        })
        .eq("user_id", profile.user_id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        await sendTelegramMessage(
          chatId,
          "❌ <b>Lỗi:</b> Không thể cập nhật thông tin.\n\nVui lòng thử lại sau."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send success message
      await sendTelegramMessage(
        chatId,
        `✅ <b>Xác thực thành công!</b>\n\n` +
        `📱 Số điện thoại: <code>${normalizedPhone}</code>\n` +
        `👤 Tài khoản: ${profile.full_name || profile.user_id}\n\n` +
        `🔒 Tài khoản của bạn đã được bảo vệ.\n\n` +
        `Vui lòng quay lại website GDTG để tiếp tục.`,
        {
          remove_keyboard: true,
        }
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default response for other messages
    await sendTelegramMessage(
      chatId,
      "ℹ️ Để xác thực tài khoản, vui lòng quét mã QR từ website GDTG."
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
