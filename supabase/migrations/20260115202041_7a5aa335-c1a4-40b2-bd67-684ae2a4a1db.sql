-- Add INSERT policy for contacts table
CREATE POLICY "Authenticated users can insert contacts"
  ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for contacts table
CREATE POLICY "Authenticated users can update contacts"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add DELETE policy for contacts table
CREATE POLICY "Authenticated users can delete contacts"
  ON public.contacts
  FOR DELETE
  TO authenticated
  USING (true);