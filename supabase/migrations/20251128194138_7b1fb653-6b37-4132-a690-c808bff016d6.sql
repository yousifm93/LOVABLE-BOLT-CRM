-- Allow CRM admins to view all application users for admin dashboard
CREATE POLICY "Admins can view all application users" 
ON public.application_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Admin'::user_role
  )
);