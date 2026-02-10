-- Allow all authenticated users to read user_roles (roles are not sensitive)
-- This is needed so regular users can see super admin's prestige UI
CREATE POLICY "Anyone can read user roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);
