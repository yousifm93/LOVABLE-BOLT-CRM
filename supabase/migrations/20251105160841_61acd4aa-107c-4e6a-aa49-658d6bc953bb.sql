-- Add created_by column to pricing_runs table to track ownership
ALTER TABLE pricing_runs 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Set default for existing rows (if any) - you may need to update this based on your needs
UPDATE pricing_runs 
SET created_by = (SELECT user_id FROM profiles LIMIT 1)
WHERE created_by IS NULL;

-- Enable RLS on pricing_runs table
ALTER TABLE pricing_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own pricing runs
CREATE POLICY "Users can insert their own pricing runs"
ON pricing_runs
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy: Allow authenticated users to view their own pricing runs
CREATE POLICY "Users can view their own pricing runs"
ON pricing_runs
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Policy: Allow authenticated users to update their own pricing runs
-- This is needed for the edge function to update results
CREATE POLICY "Users can update their own pricing runs"
ON pricing_runs
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Policy: Allow service role (edge functions) to update any pricing run
-- This allows the scraper edge function to update results
CREATE POLICY "Service role can update all pricing runs"
ON pricing_runs
FOR UPDATE
TO service_role
USING (true);

-- Create a trigger to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_pricing_run_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Set created_by to current user if not already set
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pricing_runs_set_created_by
  BEFORE INSERT ON pricing_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_pricing_run_created_by();