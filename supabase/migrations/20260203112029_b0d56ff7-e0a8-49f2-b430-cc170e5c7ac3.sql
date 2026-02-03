-- Insert popup announcement settings into platform_settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('popup_enabled', 'false', 'Bật/tắt thông báo pop-up'),
  ('popup_title', 'Thông báo quan trọng', 'Tiêu đề pop-up'),
  ('popup_content', '', 'Nội dung thông báo pop-up')
ON CONFLICT (setting_key) DO NOTHING;