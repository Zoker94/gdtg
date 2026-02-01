-- Add balance freeze columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_balance_frozen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS balance_frozen_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS balance_freeze_reason text;

-- Update check_suspicious_withdrawal function to also check frozen balance
CREATE OR REPLACE FUNCTION public.check_suspicious_withdrawal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    recent_deposit_total numeric;
    user_balance numeric;
    last_transaction_time timestamp with time zone;
    is_frozen boolean;
BEGIN
    -- Check if balance is frozen
    SELECT is_balance_frozen INTO is_frozen FROM public.profiles WHERE user_id = NEW.user_id;
    
    IF is_frozen = true THEN
        RAISE EXCEPTION 'Số dư của bạn đang bị đóng băng. Vui lòng liên hệ Admin.';
    END IF;

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
$function$;

-- Create function for admin to freeze/unfreeze balance
CREATE OR REPLACE FUNCTION public.admin_freeze_balance(p_user_id uuid, p_freeze boolean, p_reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can freeze balances';
  END IF;

  -- Update the user's freeze status
  UPDATE profiles
  SET 
    is_balance_frozen = p_freeze,
    balance_frozen_at = CASE WHEN p_freeze THEN NOW() ELSE NULL END,
    balance_freeze_reason = CASE WHEN p_freeze THEN p_reason ELSE NULL END,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$function$;