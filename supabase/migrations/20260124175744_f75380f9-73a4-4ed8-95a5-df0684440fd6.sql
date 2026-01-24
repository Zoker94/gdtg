-- Update the transaction completion trigger to work with simplified flow (deposited -> completed)
CREATE OR REPLACE FUNCTION public.handle_transaction_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  seller_profile_id uuid;
BEGIN
  -- Only process when status changes to 'completed' from 'deposited'
  -- Note: The buyer's money was already deducted when they deposited (held in escrow)
  IF NEW.status = 'completed' AND OLD.status = 'deposited' THEN
    -- Get seller profile ID
    SELECT id INTO seller_profile_id FROM profiles WHERE user_id = NEW.seller_id;
    
    -- Add seller_receives to seller balance
    UPDATE profiles 
    SET balance = balance + NEW.seller_receives,
        total_transactions = total_transactions + 1,
        updated_at = now()
    WHERE id = seller_profile_id;
    
    -- Update buyer's total_transactions
    UPDATE profiles 
    SET total_transactions = total_transactions + 1,
        updated_at = now()
    WHERE user_id = NEW.buyer_id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;