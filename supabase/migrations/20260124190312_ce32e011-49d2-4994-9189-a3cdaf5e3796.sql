-- 1. Update default reputation to 50%
ALTER TABLE public.profiles ALTER COLUMN reputation_score SET DEFAULT 50;

-- 2. Add is_submitted column to deposits (user confirms they transferred)
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS is_submitted boolean NOT NULL DEFAULT false;

-- 3. Create moderator_profiles table for extra info
CREATE TABLE public.moderator_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    display_name text NOT NULL,
    facebook_url text,
    zalo_contact text,
    phone text,
    bank_name text,
    bank_account_number text,
    bank_account_name text,
    specialization text,
    bio text,
    avatar_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderator_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can view active moderator profiles
CREATE POLICY "Everyone can view active moderators"
ON public.moderator_profiles
FOR SELECT
USING (is_active = true);

-- RLS: Admins can manage all moderator profiles
CREATE POLICY "Admins can manage moderator profiles"
ON public.moderator_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add moderator_id to transactions (the arbitrator who created/joined room)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS moderator_id uuid;

-- 5. Insert default admin bank settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
    ('admin_bank_name', 'Vietcombank', 'Tên ngân hàng admin'),
    ('admin_bank_account', '1234567890', 'Số tài khoản admin'),
    ('admin_bank_holder', 'NGUYEN VAN A', 'Tên chủ tài khoản admin')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Update handle_new_user to set reputation to 50
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, reputation_score)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 50);
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$function$;

-- 7. Update transaction completion to give fee to moderator if present
CREATE OR REPLACE FUNCTION public.handle_transaction_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_profile_id uuid;
  moderator_profile_id uuid;
BEGIN
  -- Only process when status changes to 'completed' from 'deposited'
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
$function$;

-- 8. Add unique constraint on setting_key if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_setting_key_key') THEN
        ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_setting_key_key UNIQUE (setting_key);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;