
-- =====================================================
-- FIX: Use session variable to bypass protection for trusted triggers
-- =====================================================

-- 1. Update handle_transaction_completion to set a bypass flag
CREATE OR REPLACE FUNCTION public.handle_transaction_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller_profile_id uuid;
  moderator_profile_id uuid;
BEGIN
  -- Only process when status changes to 'completed' from 'deposited' or 'shipping'
  IF NEW.status = 'completed' AND OLD.status IN ('deposited', 'shipping') THEN
    
    -- Set bypass flag for this transaction
    PERFORM set_config('app.bypass_balance_protection', 'true', true);
    
    -- Get seller profile ID
    SELECT id INTO seller_profile_id FROM profiles WHERE user_id = NEW.seller_id;
    
    -- Add seller_receives to seller balance, increment transactions, +5 reputation
    UPDATE profiles 
    SET balance = balance + NEW.seller_receives,
        total_transactions = total_transactions + 1,
        reputation_score = LEAST(reputation_score + 5, 100),
        updated_at = now()
    WHERE id = seller_profile_id;
    
    -- Update buyer's total_transactions and +5 reputation
    UPDATE profiles 
    SET total_transactions = total_transactions + 1,
        reputation_score = LEAST(reputation_score + 5, 100),
        updated_at = now()
    WHERE user_id = NEW.buyer_id;
    
    -- If moderator created this room, give them the platform fee
    IF NEW.moderator_id IS NOT NULL THEN
      SELECT id INTO moderator_profile_id FROM profiles WHERE user_id = NEW.moderator_id;
      
      IF moderator_profile_id IS NOT NULL THEN
        UPDATE profiles 
        SET balance = balance + NEW.platform_fee_amount,
            updated_at = now()
        WHERE id = moderator_profile_id;
      END IF;
    END IF;
    
    -- Reset bypass flag
    PERFORM set_config('app.bypass_balance_protection', 'false', true);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Update protect_sensitive_profile_fields to check for bypass flag
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user uuid;
  v_bypass text;
BEGIN
  -- Check if bypass flag is set by a trusted trigger
  v_bypass := current_setting('app.bypass_balance_protection', true);
  IF v_bypass = 'true' THEN
    RETURN NEW;
  END IF;

  v_current_user := auth.uid();
  
  -- Allow system triggers (when auth.uid() is NULL) to update anything
  IF v_current_user IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow admins to update anything
  IF has_role(v_current_user, 'admin') OR has_role(v_current_user, 'super_admin') THEN
    RETURN NEW;
  END IF;
  
  -- For regular users, prevent modification of sensitive fields
  NEW.balance := OLD.balance;
  NEW.reputation_score := OLD.reputation_score;
  NEW.total_transactions := OLD.total_transactions;
  NEW.is_banned := OLD.is_banned;
  NEW.banned_at := OLD.banned_at;
  NEW.ban_reason := OLD.ban_reason;
  NEW.is_suspicious := OLD.is_suspicious;
  NEW.suspicious_reason := OLD.suspicious_reason;
  NEW.suspicious_at := OLD.suspicious_at;
  NEW.is_balance_frozen := OLD.is_balance_frozen;
  NEW.balance_frozen_at := OLD.balance_frozen_at;
  NEW.balance_freeze_reason := OLD.balance_freeze_reason;
  NEW.warning_message := OLD.warning_message;
  NEW.kyc_status := OLD.kyc_status;
  NEW.is_verified := OLD.is_verified;
  
  RETURN NEW;
END;
$$;

-- 3. Also update the refund trigger to use bypass flag
CREATE OR REPLACE FUNCTION public.handle_transaction_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buyer_profile_id uuid;
  refund_amount numeric;
BEGIN
  -- Only process when status changes to 'cancelled' or 'refunded' from 'deposited' or 'shipping'
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status IN ('deposited', 'shipping') THEN
    
    -- Set bypass flag
    PERFORM set_config('app.bypass_balance_protection', 'true', true);
    
    -- Get buyer profile ID
    SELECT id INTO buyer_profile_id FROM profiles WHERE user_id = NEW.buyer_id;
    
    -- Calculate refund amount (original amount that buyer paid)
    refund_amount := NEW.amount;
    
    -- Add platform fee back if buyer paid it
    IF NEW.fee_bearer = 'buyer' THEN
      refund_amount := refund_amount + COALESCE(NEW.platform_fee_amount, 0);
    END IF;
    
    -- Refund to buyer's balance
    UPDATE profiles 
    SET balance = balance + refund_amount,
        updated_at = now()
    WHERE id = buyer_profile_id;
    
    -- Reset bypass flag
    PERFORM set_config('app.bypass_balance_protection', 'false', true);
  END IF;
  
  RETURN NEW;
END;
$$;
