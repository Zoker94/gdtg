
-- Add Telegram notification settings to platform_settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('admin_telegram_chat_id', '', 'Chat ID Telegram của admin để nhận thông báo'),
  ('telegram_notifications_enabled', 'false', 'Bật/tắt thông báo Telegram cho admin')
ON CONFLICT DO NOTHING;
