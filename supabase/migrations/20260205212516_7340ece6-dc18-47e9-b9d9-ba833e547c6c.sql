-- Drop the existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can select conditions for their account leads" ON lead_conditions;
DROP POLICY IF EXISTS "Users can view conditions for their account leads" ON lead_conditions;

-- Create new permissive SELECT policy matching leads table
CREATE POLICY "Authenticated users can view lead conditions"
  ON lead_conditions
  FOR SELECT
  TO authenticated
  USING (true);