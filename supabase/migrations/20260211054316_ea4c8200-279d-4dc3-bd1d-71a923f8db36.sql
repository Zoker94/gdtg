
-- Add separate bot token for notification bot
INSERT INTO public.admin_secrets (secret_key, secret_value, description)
VALUES ('TELEGRAM_NOTIFY_BOT_TOKEN', '', 'Token của Bot Telegram thông báo cho Admin (khác bot xác thực)')
ON CONFLICT DO NOTHING;
