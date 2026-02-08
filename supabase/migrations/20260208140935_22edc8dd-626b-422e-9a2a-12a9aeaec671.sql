-- =====================================================
-- FIX CRITICAL VULNERABILITY: Prevent users from updating sensitive fields
-- =====================================================

-- Create a trigger function to protect sensitive profile fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to update anything
  IF has_role(auth.uid(), 'admin') THEN
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

-- Create the trigger (BEFORE UPDATE so we can modify NEW values)
DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- =====================================================
-- BONUS: Add audit trigger for balance changes (from previous request)
-- =====================================================

-- Create audit function for balance changes
CREATE OR REPLACE FUNCTION public.audit_balance_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_source text;
BEGIN
  -- Only log if balance actually changed
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    -- Get current user (if any)
    v_admin_id := auth.uid();
    
    -- Determine source of change
    IF v_admin_id IS NULL THEN
      v_source := 'system_trigger';
    ELSIF has_role(v_admin_id, 'admin') THEN
      v_source := 'admin_manual';
    ELSE
      v_source := 'unknown';
    END IF;
    
    -- Skip logging for super_admin (Log Eraser feature)
    IF v_admin_id IS NOT NULL AND is_super_admin(v_admin_id) THEN
      RETURN NEW;
    END IF;
    
    -- Insert audit log
    INSERT INTO public.admin_action_logs (
      admin_id,
      target_user_id,
      action_type,
      details,
      note
    ) VALUES (
      COALESCE(v_admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.user_id,
      'balance_change',
      jsonb_build_object(
        'old_balance', OLD.balance,
        'new_balance', NEW.balance,
        'difference', NEW.balance - OLD.balance,
        'source', v_source
      ),
      CASE 
        WHEN v_source = 'system_trigger' THEN 'Thay đổi tự động bởi hệ thống'
        WHEN v_source = 'admin_manual' THEN 'Thay đổi thủ công bởi Admin'
        ELSE 'Nguồn không xác định'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the balance audit trigger
DROP TRIGGER IF EXISTS audit_profile_balance_changes ON public.profiles;
CREATE TRIGGER audit_profile_balance_changes
  AFTER UPDATE OF balance ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_balance_changes();