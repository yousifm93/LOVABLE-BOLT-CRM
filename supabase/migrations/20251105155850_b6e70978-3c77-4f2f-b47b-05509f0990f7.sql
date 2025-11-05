-- Add results and error tracking columns to pricing_runs table
ALTER TABLE pricing_runs 
ADD COLUMN IF NOT EXISTS results_json jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Add index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_pricing_runs_status ON pricing_runs(status);

-- Add index for faster queries on created_by
CREATE INDEX IF NOT EXISTS idx_pricing_runs_created_by ON pricing_runs(created_by);