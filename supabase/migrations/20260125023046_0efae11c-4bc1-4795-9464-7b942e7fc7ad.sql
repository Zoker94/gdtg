-- Confirm deposit coming from SePay webhook (service_role only)
CREATE OR REPLACE FUNCTION public.confirm_deposit_sepay(
  p_deposit_id UUID,
  p_transfer_amount NUMERIC,
  p_reference TEXT,
  p_sepay_tx_id BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit public.deposits%ROWTYPE;
BEGIN
  -- Only allow calls with service_role JWT
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_deposit
  FROM public.deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Idempotent: only process pending
  IF v_deposit.status IS DISTINCT FROM 'pending' THEN
    RETURN;
  END IF;

  UPDATE public.deposits
  SET
    status = 'completed',
    confirmed_at = NOW(),
    transaction_ref = COALESCE(p_reference, transaction_ref),
    admin_note = (
      CASE
        WHEN admin_note IS NULL OR admin_note = '' THEN ''
        ELSE admin_note || E'\n'
      END
    ) || 'Tự động xác nhận qua SePay. Số tiền thực nhận: ' || p_transfer_amount::BIGINT::TEXT || 'đ'
  WHERE id = p_deposit_id;

  UPDATE public.profiles
  SET balance = balance + p_transfer_amount::BIGINT
  WHERE user_id = v_deposit.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_deposit_sepay(UUID, NUMERIC, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_deposit_sepay(UUID, NUMERIC, TEXT, BIGINT) TO service_role;
