-- Add timestamp columns to track when leads enter each pipeline stage
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS pending_app_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS app_complete_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pre_qualified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pre_approved_at TIMESTAMP WITH TIME ZONE;

-- Create function to auto-update stage timestamps when pipeline_stage_id changes
CREATE OR REPLACE FUNCTION update_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If pipeline_stage_id changed, update the appropriate timestamp
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    CASE NEW.pipeline_stage_id::text
      WHEN '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945' THEN -- Pending App
        NEW.pending_app_at = NOW();
      WHEN 'a4e162e0-5421-4d17-8ad5-4b1195bbc995' THEN -- Screening (App Complete)
        NEW.app_complete_at = NOW();
      WHEN '09162eec-d2b2-48e5-86d0-9e66ee8b2af7' THEN -- Pre-Qualified
        NEW.pre_qualified_at = NOW();
      WHEN '3cbf38ff-752e-4163-a9a3-1757499b4945' THEN -- Pre-Approved
        NEW.pre_approved_at = NOW();
      ELSE
        NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS stage_timestamp_trigger ON leads;
CREATE TRIGGER stage_timestamp_trigger
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_stage_timestamp();