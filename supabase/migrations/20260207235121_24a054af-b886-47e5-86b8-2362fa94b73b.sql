-- Add platform setting for falling petals effect
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('tet_falling_petals_enabled', 'true', 'Bật/tắt hiệu ứng hoa mai rơi trên trang chủ')
ON CONFLICT (setting_key) DO NOTHING;