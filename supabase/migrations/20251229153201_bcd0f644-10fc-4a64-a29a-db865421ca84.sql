-- Drop existing incorrect RLS policies on user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage all user permissions" ON public.user_permissions;

-- Create new RLS policy for users to view their own permissions
-- This correctly joins via users.auth_user_id to match the authenticated user
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.id = user_permissions.user_id
  )
);

-- Create new RLS policy for admins to manage all user permissions
-- This correctly checks admin role via users.auth_user_id
CREATE POLICY "Admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'Admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'Admin'::user_role
  )
);