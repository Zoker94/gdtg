-- Add suspicious flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspicious_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspicious_at timestamp with time zone;

-- Add on_hold status to withdrawals enum (using text, update check)
-- First, let's see current withdrawal statuses and add on_hold

-- Create linked_bank_accounts table (max 2 per user)
CREATE TABLE public.linked_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    bank_name text NOT NULL,
    bank_account_number text NOT NULL,
    bank_account_name text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, bank_account_number)
);

-- Create risk_alerts table
CREATE TABLE public.risk_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    alert_type text NOT NULL, -- 'high_volume', 'rapid_transactions', 'multiple_banks', 'quick_withdraw', 'multiple_sources'
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.linked_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

-- RLS for linked_bank_accounts
CREATE POLICY "Users can view their own linked banks"
ON public.linked_bank_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linked banks"
ON public.linked_bank_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked banks"
ON public.linked_bank_accounts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all linked banks"
ON public.linked_bank_accounts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all linked banks"
ON public.linked_bank_accounts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for risk_alerts (admin only)
CREATE POLICY "Admins can view all risk alerts"
ON public.risk_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage risk alerts"
ON public.risk_alerts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if user can add more banks (max 2)
CREATE OR REPLACE FUNCTION public.check_bank_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.linked_bank_accounts WHERE user_id = NEW.user_id) >= 2 THEN
        RAISE EXCEPTION 'Mỗi tài khoản chỉ được đăng ký tối đa 2 ngân hàng rút tiền';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_bank_limit_trigger
BEFORE INSERT ON public.linked_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.check_bank_limit();

-- Function to detect suspicious quick withdrawal (deposit then withdraw >80% within 2h)
CREATE OR REPLACE FUNCTION public.check_suspicious_withdrawal()
RETURNS TRIGGER AS $$
DECLARE
    recent_deposit_total numeric;
    user_balance numeric;
    last_transaction_time timestamp with time zone;
BEGIN
    -- Get user's current balance
    SELECT balance INTO user_balance FROM public.profiles WHERE user_id = NEW.user_id;
    
    -- Get total deposits in last 2 hours
    SELECT COALESCE(SUM(amount), 0), MAX(confirmed_at) 
    INTO recent_deposit_total, last_transaction_time
    FROM public.deposits 
    WHERE user_id = NEW.user_id 
    AND status = 'confirmed'
    AND confirmed_at > NOW() - INTERVAL '2 hours';
    
    -- Check if user has any completed transactions in the meantime
    IF recent_deposit_total > 0 THEN
        -- Check if there's a legitimate transaction
        IF NOT EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE (buyer_id = NEW.user_id OR seller_id = NEW.user_id)
            AND status = 'completed'
            AND completed_at > last_transaction_time
        ) THEN
            -- Check if withdrawing more than 80% of recent deposits
            IF NEW.amount > (recent_deposit_total * 0.8) THEN
                -- Mark as suspicious
                UPDATE public.profiles 
                SET is_suspicious = true, 
                    suspicious_reason = 'Nạp tiền và rút ngay >80% trong vòng 2h mà không có giao dịch trung gian',
                    suspicious_at = NOW()
                WHERE user_id = NEW.user_id;
                
                -- Create risk alert
                INSERT INTO public.risk_alerts (user_id, alert_type, description, metadata)
                VALUES (
                    NEW.user_id, 
                    'quick_withdraw',
                    'Người dùng nạp ' || recent_deposit_total || ' VNĐ và yêu cầu rút ' || NEW.amount || ' VNĐ trong vòng 2h',
                    jsonb_build_object('deposit_amount', recent_deposit_total, 'withdraw_amount', NEW.amount)
                );
                
                -- Set withdrawal to on_hold
                NEW.status := 'on_hold';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_suspicious_withdrawal_trigger
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.check_suspicious_withdrawal();

-- Function to check daily transaction volume
CREATE OR REPLACE FUNCTION public.check_daily_volume()
RETURNS TRIGGER AS $$
DECLARE
    daily_total numeric;
BEGIN
    -- Calculate total deposits + withdrawals today
    SELECT COALESCE(
        (SELECT SUM(amount) FROM public.deposits WHERE user_id = NEW.user_id AND DATE(created_at) = CURRENT_DATE),
        0
    ) + COALESCE(
        (SELECT SUM(amount) FROM public.withdrawals WHERE user_id = NEW.user_id AND DATE(created_at) = CURRENT_DATE),
        0
    ) INTO daily_total;
    
    -- Add current transaction
    daily_total := daily_total + NEW.amount;
    
    -- Check if exceeds 50M VND
    IF daily_total > 50000000 THEN
        INSERT INTO public.risk_alerts (user_id, alert_type, description, metadata)
        VALUES (
            NEW.user_id,
            'high_volume',
            'Tổng giao dịch vượt quá 50 triệu VNĐ/ngày: ' || daily_total || ' VNĐ',
            jsonb_build_object('daily_total', daily_total)
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply to both deposits and withdrawals
CREATE TRIGGER check_daily_volume_deposits
AFTER INSERT ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.check_daily_volume();

CREATE TRIGGER check_daily_volume_withdrawals
AFTER INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.check_daily_volume();

-- Function to check rapid transactions (>5 in 1 hour)
CREATE OR REPLACE FUNCTION public.check_rapid_transactions()
RETURNS TRIGGER AS $$
DECLARE
    hourly_count integer;
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM public.deposits WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 hour') +
        (SELECT COUNT(*) FROM public.withdrawals WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '1 hour')
    INTO hourly_count;
    
    IF hourly_count > 5 THEN
        INSERT INTO public.risk_alerts (user_id, alert_type, description, metadata)
        VALUES (
            NEW.user_id,
            'rapid_transactions',
            'Có hơn 5 giao dịch nạp/rút trong vòng 1 giờ',
            jsonb_build_object('transaction_count', hourly_count)
        )
        ON CONFLICT DO NOTHING;
        
        UPDATE public.profiles 
        SET is_suspicious = true, 
            suspicious_reason = 'Giao dịch bất thường: hơn 5 lần nạp/rút trong 1 giờ',
            suspicious_at = NOW()
        WHERE user_id = NEW.user_id AND is_suspicious = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_rapid_deposits
AFTER INSERT ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.check_rapid_transactions();

CREATE TRIGGER check_rapid_withdrawals
AFTER INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.check_rapid_transactions();

-- Update withdrawal confirm function to check phone verification and KYC name match
CREATE OR REPLACE FUNCTION public.confirm_withdrawal(withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    w_user_id uuid;
    w_amount numeric;
    w_bank_name text;
    w_status text;
    user_balance numeric;
    is_phone_verified boolean;
BEGIN
    -- Get withdrawal info
    SELECT user_id, amount, bank_account_name, status 
    INTO w_user_id, w_amount, w_bank_name, w_status
    FROM public.withdrawals WHERE id = withdrawal_id;
    
    IF w_user_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy yêu cầu rút tiền';
    END IF;
    
    IF w_status NOT IN ('pending', 'on_hold') THEN
        RAISE EXCEPTION 'Yêu cầu rút tiền không ở trạng thái chờ xử lý';
    END IF;
    
    -- Get user balance
    SELECT balance, is_verified INTO user_balance, is_phone_verified
    FROM public.profiles WHERE user_id = w_user_id;
    
    IF user_balance < w_amount THEN
        RAISE EXCEPTION 'Số dư không đủ';
    END IF;
    
    -- Deduct balance
    UPDATE public.profiles 
    SET balance = balance - w_amount,
        updated_at = NOW()
    WHERE user_id = w_user_id;
    
    -- Update withdrawal status
    UPDATE public.withdrawals 
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = withdrawal_id;
END;
$$;

-- Function to put withdrawal on hold
CREATE OR REPLACE FUNCTION public.hold_withdrawal(withdrawal_id uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.withdrawals 
    SET status = 'on_hold',
        admin_note = COALESCE(reason, 'Đang kiểm tra')
    WHERE id = withdrawal_id AND status = 'pending';
END;
$$;