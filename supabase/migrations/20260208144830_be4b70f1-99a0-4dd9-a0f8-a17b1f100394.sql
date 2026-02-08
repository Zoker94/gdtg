
-- =====================================================
-- FIX: Allow system triggers (auth.uid() = NULL) to update sensitive fields
-- This fixes the issue where handle_transaction_completion trigger cannot update balance
-- =====================================================

CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user uuid;
BEGIN
  v_current_user := auth.uid();
  
  -- Allow system triggers (when auth.uid() is NULL) to update anything
  -- This is critical for triggers like handle_transaction_completion
  IF v_current_user IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow admins to update anything
  IF has_role(v_current_user, 'admin') OR has_role(v_current_user, 'super_admin') THEN
    RETURN NEW;
  END IF;
  
  -- For regular users, prevent modification of sensitive fields
  -- Reset sensitive fields to their original values
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

-- Also fix the seller's missing balance from the problematic transaction
-- User: 87727dcd-83bb-42d5-be55-364957c12fff should have 1,950,000 (received as seller) but has 1,000,000
-- Missing: 950,000 from transaction 2382d3d8-1ac6-4b35-8886-1d3984912588
UPDATE profiles 
SET balance = balance + 950000
WHERE user_id = '87727dcd-83bb-42d5-be55-364957c12fff';
