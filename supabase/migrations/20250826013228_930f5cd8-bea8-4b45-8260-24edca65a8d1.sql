-- Fix security vulnerability: Restrict users table access to authenticated users only
-- Replace the overly permissive policy that allows public access to user data

-- Drop the existing policy that allows public access
DROP POLICY IF EXISTS "Users can view all users" ON public.users;

-- Create a new policy that only allows authenticated users to view user data
CREATE POLICY "Authenticated users can view all users" 
ON public.users 
FOR SELECT 
TO authenticated
USING (true);

-- Keep the existing policies for user creation and updates as they are appropriately secured
-- The "Allow user creation" and "Allow user updates" policies are fine as they stand