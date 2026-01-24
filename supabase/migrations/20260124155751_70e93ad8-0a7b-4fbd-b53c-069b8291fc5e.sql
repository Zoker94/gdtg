-- Update RLS policy to allow viewing other users' public profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow users to view any profile (public profiles for viewing reputation/transaction count)
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: Users can still only update their own profile (existing policy remains)