-- Tạo bảng withdrawals (yêu cầu rút tiền)
CREATE TABLE public.withdrawals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    bank_name text NOT NULL,
    bank_account_number text NOT NULL,
    bank_account_name text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    admin_note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view their own withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests" 
ON public.withdrawals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals" 
ON public.withdrawals 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update withdrawals
CREATE POLICY "Admins can update withdrawals" 
ON public.withdrawals 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete withdrawals
CREATE POLICY "Admins can delete withdrawals" 
ON public.withdrawals 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function để admin xác nhận rút tiền (trừ tiền từ balance)
CREATE OR REPLACE FUNCTION public.confirm_withdrawal(withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    w RECORD;
    user_balance numeric;
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get withdrawal info
    SELECT * INTO w FROM withdrawals WHERE id = withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal not found or already processed';
    END IF;

    -- Check user balance
    SELECT balance INTO user_balance FROM profiles WHERE user_id = w.user_id;
    
    IF user_balance < w.amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update withdrawal status
    UPDATE withdrawals 
    SET status = 'completed', completed_at = now() 
    WHERE id = withdrawal_id;

    -- Deduct balance from user profile
    UPDATE profiles 
    SET balance = balance - w.amount 
    WHERE user_id = w.user_id;
END;
$$;

-- Function để admin từ chối rút tiền
CREATE OR REPLACE FUNCTION public.reject_withdrawal(withdrawal_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Update withdrawal status
    UPDATE withdrawals 
    SET status = 'rejected', admin_note = reason, completed_at = now() 
    WHERE id = withdrawal_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal not found or already processed';
    END IF;
END;
$$;