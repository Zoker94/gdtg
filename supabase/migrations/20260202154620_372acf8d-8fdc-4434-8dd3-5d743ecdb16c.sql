-- Update RLS policies to allow admins to manage non-admin roles
-- Super admins can manage all roles, admins can only manage user/moderator roles

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;

-- Super admins can do everything
CREATE POLICY "Super admins full access"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Admins can view all roles (needed to show role management UI)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert non-admin roles (user, moderator only)
CREATE POLICY "Admins can insert non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND role IN ('user'::app_role, 'moderator'::app_role)
);

-- Admins can delete non-admin roles (user, moderator only)
CREATE POLICY "Admins can delete non-admin roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND role IN ('user'::app_role, 'moderator'::app_role)
);