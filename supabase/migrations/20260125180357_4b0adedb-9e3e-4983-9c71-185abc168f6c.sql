-- Insert admin_contact_link setting if not exists
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('admin_contact_link', '', 'Link liên hệ Admin hỗ trợ rút tiền (Zalo/Messenger)')
ON CONFLICT (setting_key) DO NOTHING;