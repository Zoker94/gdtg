import { supabase } from "@/integrations/supabase/client";

type NotifyType = "kyc" | "withdrawal" | "deposit" | "dispute" | "risk_alert" | "custom";

export const notifyAdminTelegram = async (
  type: NotifyType,
  title: string,
  message: string
) => {
  try {
    await supabase.functions.invoke("telegram-notify-admin", {
      body: { type, title, message },
    });
  } catch (error) {
    // Silent fail - notifications should not block main flow
    console.warn("Telegram notify failed:", error);
  }
};
