-- Add registration_ip column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registration_ip inet;

-- Create index for faster IP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_registration_ip ON public.profiles(registration_ip);

-- Create function to count accounts by IP
CREATE OR REPLACE FUNCTION public.count_accounts_by_ip(p_ip inet)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer 
  FROM profiles 
  WHERE registration_ip = p_ip;
$$;

-- Create function to check and register IP (called from edge function with service role)
CREATE OR REPLACE FUNCTION public.register_user_ip(p_user_id uuid, p_ip inet)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ip_count integer;
  v_max_accounts constant integer := 3;
BEGIN
  -- Count existing accounts with this IP
  SELECT COUNT(*) INTO v_ip_count
  FROM profiles 
  WHERE registration_ip = p_ip;
  
  -- If already at max, reject
  IF v_ip_count >= v_max_accounts THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IP_LIMIT_EXCEEDED',
      'message', 'Địa chỉ IP này đã đạt giới hạn tạo tài khoản (tối đa 3 tài khoản/IP)'
    );
  END IF;
  
  -- Update profile with IP
  UPDATE profiles 
  SET registration_ip = p_ip,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- If this is 2nd or 3rd account from same IP, create risk alert
  IF v_ip_count >= 1 THEN
    INSERT INTO risk_alerts (user_id, alert_type, description, metadata)
    VALUES (
      p_user_id,
      'multiple_accounts_ip',
      format('Phát hiện tài khoản thứ %s được tạo từ cùng địa chỉ IP', v_ip_count + 1),
      jsonb_build_object(
        'ip_address', p_ip::text,
        'account_number', v_ip_count + 1,
        'existing_accounts', (
          SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'full_name', full_name, 'created_at', created_at))
          FROM profiles 
          WHERE registration_ip = p_ip
        )
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'account_number', v_ip_count + 1,
    'warning', CASE WHEN v_ip_count >= 1 THEN 'Đây là tài khoản thứ ' || (v_ip_count + 1) || ' từ IP này' ELSE null END
  );
END;
$$;