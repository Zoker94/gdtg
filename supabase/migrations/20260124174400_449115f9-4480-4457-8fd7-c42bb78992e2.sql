-- Create function to handle balance deduction when transaction is completed
CREATE OR REPLACE FUNCTION public.handle_transaction_completion()
RETURNS TRIGGER AS $$
DECLARE
  buyer_profile_id uuid;
  seller_profile_id uuid;
  buyer_fee_amount numeric;
  seller_fee_amount numeric;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status = 'shipping' THEN
    -- Get profile IDs
    SELECT id INTO buyer_profile_id FROM profiles WHERE user_id = NEW.buyer_id;
    SELECT id INTO seller_profile_id FROM profiles WHERE user_id = NEW.seller_id;
    
    -- Calculate fees based on fee_bearer
    IF NEW.fee_bearer = 'buyer' THEN
      buyer_fee_amount := NEW.platform_fee_amount;
      seller_fee_amount := 0;
    ELSIF NEW.fee_bearer = 'seller' THEN
      buyer_fee_amount := 0;
      seller_fee_amount := NEW.platform_fee_amount;
    ELSE -- split
      buyer_fee_amount := NEW.platform_fee_amount / 2;
      seller_fee_amount := NEW.platform_fee_amount / 2;
    END IF;
    
    -- Deduct full amount from buyer (amount includes their portion of fee if applicable)
    UPDATE profiles 
    SET balance = balance - NEW.amount,
        total_transactions = total_transactions + 1,
        updated_at = now()
    WHERE id = buyer_profile_id;
    
    -- Add seller_receives to seller balance
    UPDATE profiles 
    SET balance = balance + NEW.seller_receives,
        total_transactions = total_transactions + 1,
        updated_at = now()
    WHERE id = seller_profile_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for transaction completion
DROP TRIGGER IF EXISTS on_transaction_completed ON transactions;
CREATE TRIGGER on_transaction_completed
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_transaction_completion();