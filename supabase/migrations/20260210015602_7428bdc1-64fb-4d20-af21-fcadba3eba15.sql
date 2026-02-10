
-- Recreate profiles_public view WITHOUT security_invoker 
-- so all authenticated users can read public profile data
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
  SELECT 
    id,
    user_id,
    full_name,
    avatar_url,
    reputation_score,
    total_transactions,
    kyc_status,
    is_verified,
    bio,
    facebook_url,
    zalo_contact,
    created_at,
    updated_at
  FROM public.profiles;

-- Grant access to the view for authenticated and anon roles
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
