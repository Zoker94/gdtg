-- Add 'moderator' to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'moderator';

-- Fix the transaction completion trigger to properly handle fees
CREATE OR REPLACE FUNCTION public.handle_transaction_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  seller_profile_id uuid;
  buyer_fee_amount numeric;
BEGIN
  -- Only process when status changes to 'completed' from 'deposited'
  IF NEW.status = 'completed' AND OLD.status = 'deposited' THEN
    -- Get seller profile ID
    SELECT id INTO seller_profile_id FROM profiles WHERE user_id = NEW.seller_id;
    
    -- Calculate fees based on fee_bearer
    -- The buyer deposited the full amount when status changed to 'deposited'
    -- Now we distribute the money:
    -- - seller_receives is already calculated by calculate_transaction_fees trigger
    -- - The platform fee is: amount * (platform_fee_percent / 100)
    
    -- Add seller_receives to seller balance (this already has fee deducted if fee_bearer is 'seller' or 'split')
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
    
    -- If fee_bearer is 'buyer' or 'split', the difference between deposited amount and seller_receives 
    -- is the platform fee (already held by the escrow system)
    -- No additional deduction needed as buyer already deposited full amount
    
  END IF;
  
  RETURN NEW;
END;
$function$;