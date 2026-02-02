-- Create admin_secrets table for storing API keys (admin-only access)
CREATE TABLE public.admin_secrets (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    secret_key text NOT NULL UNIQUE,
    secret_value text NOT NULL DEFAULT '',
    description text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- Only admins can read secrets
CREATE POLICY "Admins can read secrets" ON public.admin_secrets
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update secrets
CREATE POLICY "Admins can update secrets" ON public.admin_secrets
    FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert secrets
CREATE POLICY "Admins can insert secrets" ON public.admin_secrets
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default API key placeholders
INSERT INTO public.admin_secrets (secret_key, secret_value, description) VALUES
    ('TELEGRAM_BOT_TOKEN', '', 'Token của Telegram Bot để gửi thông báo'),
    ('SEPAY_MERCHANT_ID', '', 'Merchant ID từ SePay'),
    ('SEPAY_SECRET_KEY', '', 'Secret Key từ SePay để xác thực webhook');

-- Create trigger for updated_at
CREATE TRIGGER update_admin_secrets_updated_at
    BEFORE UPDATE ON public.admin_secrets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();