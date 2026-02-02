-- Insert maintenance_mode setting with default value false
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('maintenance_mode', 'false', 'Chế độ bảo trì - khi bật sẽ chặn truy cập từ tất cả người dùng trừ Super Admin')
ON CONFLICT (setting_key) DO NOTHING;