-- Create function to handle buyer deposit (escrow deduction)
CREATE OR REPLACE FUNCTION public.process_buyer_deposit(p_transaction_id uuid, p_buyer_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_balance numeric;
  v_transaction RECORD;
BEGIN
  -- Get transaction info
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Giao dịch không tồn tại';
  END IF;
  
  -- Verify the caller is the buyer
  IF auth.uid() != p_buyer_id OR v_transaction.buyer_id != p_buyer_id THEN
    RAISE EXCEPTION 'Bạn không phải người mua của giao dịch này';
  END IF;
  
  -- Check transaction status
  IF v_transaction.status != 'pending' THEN
    RAISE EXCEPTION 'Giao dịch không ở trạng thái chờ thanh toán';
  END IF;
  
  -- Get buyer balance
  SELECT balance INTO v_buyer_balance FROM profiles WHERE user_id = p_buyer_id;
  
  IF v_buyer_balance < p_amount THEN
    RAISE EXCEPTION 'Số dư không đủ. Cần: % VNĐ, Hiện có: % VNĐ', p_amount, v_buyer_balance;
  END IF;
  
  -- Set bypass flag
  PERFORM set_config('app.bypass_balance_protection', 'true', true);
  
  -- Deduct from buyer balance
  UPDATE profiles 
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_buyer_id;
  
  -- Update transaction status to deposited
  UPDATE transactions
  SET status = 'deposited',
      deposited_at = now(),
      updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Reset bypass flag
  PERFORM set_config('app.bypass_balance_protection', 'false', true);
END;
$function$;