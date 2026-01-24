-- Create function to handle automatic refunds
CREATE OR REPLACE FUNCTION public.handle_transaction_refund()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Refund buyer when transaction is cancelled or refunded from deposited status
  -- Only refund if the buyer had already deposited (status was 'deposited')
  IF (NEW.status = 'cancelled' OR NEW.status = 'refunded') 
     AND OLD.status = 'deposited' 
     AND NEW.buyer_id IS NOT NULL THEN
    
    -- Return the full amount to buyer's balance
    UPDATE profiles 
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE user_id = NEW.buyer_id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic refunds
DROP TRIGGER IF EXISTS on_transaction_refund ON transactions;
CREATE TRIGGER on_transaction_refund
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_transaction_refund();