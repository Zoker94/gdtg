-- Create deposits table for tracking deposit requests
CREATE TABLE public.deposits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    transaction_ref TEXT,
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "Users can view their own deposits"
ON public.deposits FOR SELECT
USING (auth.uid() = user_id);

-- Users can create deposits
CREATE POLICY "Users can insert their own deposits"
ON public.deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all deposits
CREATE POLICY "Admins can view all deposits"
ON public.deposits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update deposits (confirm/cancel)
CREATE POLICY "Admins can update all deposits"
ON public.deposits FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to confirm deposit and add balance
CREATE OR REPLACE FUNCTION public.confirm_deposit(deposit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    dep RECORD;
BEGIN
    -- Check if caller is admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get deposit info
    SELECT * INTO dep FROM deposits WHERE id = deposit_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deposit not found or already processed';
    END IF;

    -- Update deposit status
    UPDATE deposits 
    SET status = 'completed', confirmed_at = now() 
    WHERE id = deposit_id;

    -- Add balance to user profile
    UPDATE profiles 
    SET balance = balance + dep.amount 
    WHERE user_id = dep.user_id;
END;
$$;