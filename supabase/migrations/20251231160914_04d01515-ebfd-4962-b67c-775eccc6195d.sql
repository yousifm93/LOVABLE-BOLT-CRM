-- Drop the overly permissive policy that allows anyone to manage lenders
DROP POLICY IF EXISTS "Anyone can manage lenders" ON public.lenders;

-- Create restrictive policies that require authentication
-- Allow authenticated users to read lenders
CREATE POLICY "Authenticated users can view lenders"
ON public.lenders
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert lenders
CREATE POLICY "Authenticated users can insert lenders"
ON public.lenders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update lenders
CREATE POLICY "Authenticated users can update lenders"
ON public.lenders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete lenders
CREATE POLICY "Authenticated users can delete lenders"
ON public.lenders
FOR DELETE
TO authenticated
USING (true);