
-- Update approve_kyc function to add +20 reputation
CREATE OR REPLACE FUNCTION public.approve_kyc(p_submission_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if caller is admin or moderator
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get user_id from submission
  SELECT user_id INTO v_user_id FROM kyc_submissions WHERE id = p_submission_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;

  -- Update submission status
  UPDATE kyc_submissions 
  SET status = 'approved', reviewer_id = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_submission_id;

  -- Update profile kyc_status AND add +20 reputation (capped at 100)
  UPDATE profiles 
  SET 
    kyc_status = 'approved', 
    reputation_score = LEAST(reputation_score + 20, 100),
    updated_at = now() 
  WHERE user_id = v_user_id;
END;
$$;

-- Update handle_transaction_completion function to add +5 reputation for both parties
CREATE OR REPLACE FUNCTION public.handle_transaction_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_profile_id uuid;
  moderator_profile_id uuid;
BEGIN
  -- Only process when status changes to 'completed' from 'deposited' or 'shipping'
  IF NEW.status = 'completed' AND OLD.status IN ('deposited', 'shipping') THEN
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
    
  END IF;
  
  RETURN NEW;
END;
$$;
