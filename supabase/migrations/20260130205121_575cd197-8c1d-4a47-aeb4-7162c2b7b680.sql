-- Add retry tracking columns to pricing_runs
ALTER TABLE pricing_runs 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;

-- Drop existing status constraint if it exists
ALTER TABLE pricing_runs 
DROP CONSTRAINT IF EXISTS pricing_runs_status_check;

-- Add updated status constraint to include 'queued'
ALTER TABLE pricing_runs 
ADD CONSTRAINT pricing_runs_status_check 
CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled'));

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_pricing_runs_queue_status 
ON pricing_runs(status, queued_at) 
WHERE status IN ('queued', 'failed');

-- Comment for clarity
COMMENT ON COLUMN pricing_runs.retry_count IS 'Number of retry attempts made for this run';
COMMENT ON COLUMN pricing_runs.max_retries IS 'Maximum retry attempts allowed (default 3)';
COMMENT ON COLUMN pricing_runs.queued_at IS 'Timestamp when run was queued for processing';