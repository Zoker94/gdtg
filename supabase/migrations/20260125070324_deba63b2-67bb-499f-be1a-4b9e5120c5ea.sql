-- Create function for admin to adjust user balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can adjust balances';
  END IF;

  -- Update the user's balance
  UPDATE profiles
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;