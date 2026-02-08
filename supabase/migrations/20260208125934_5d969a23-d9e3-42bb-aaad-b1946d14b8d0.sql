-- Create a public view for profiles that hides sensitive data
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  reputation_score,
  total_transactions,
  is_verified,
  kyc_status,
  facebook_url,
  zalo_contact,
  created_at,
  updated_at
FROM public.profiles;

-- Drop the old permissive policy that exposes all data
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy: Users can only view their OWN full profile
CREATE POLICY "Users can view own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Grant select on the public view to authenticated and anon users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;