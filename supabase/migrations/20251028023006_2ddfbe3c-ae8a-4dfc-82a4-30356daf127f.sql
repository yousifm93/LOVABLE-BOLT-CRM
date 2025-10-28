-- Add active_at timestamp column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS active_at timestamp with time zone;

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on any lead update
DROP TRIGGER IF EXISTS set_leads_updated_at ON leads;
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Create trigger function to stamp stage timestamps when pipeline_stage_id changes
CREATE OR REPLACE FUNCTION stamp_stage_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if pipeline_stage_id actually changed
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    -- Pending App stage
    IF NEW.pipeline_stage_id = '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945'::uuid 
       AND NEW.pending_app_at IS NULL THEN
      NEW.pending_app_at = now();
    END IF;
    
    -- Screening stage (sets app_complete_at)
    IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid 
       AND NEW.app_complete_at IS NULL THEN
      NEW.app_complete_at = now();
    END IF;
    
    -- Pre-Qualified stage
    IF NEW.pipeline_stage_id = '09162eec-d2b2-48e5-86d0-9e66ee8b2af7'::uuid 
       AND NEW.pre_qualified_at IS NULL THEN
      NEW.pre_qualified_at = now();
    END IF;
    
    -- Pre-Approved stage
    IF NEW.pipeline_stage_id = '3cbf38ff-752e-4163-a9a3-1757499b4945'::uuid 
       AND NEW.pre_approved_at IS NULL THEN
      NEW.pre_approved_at = now();
    END IF;
    
    -- Active stage
    IF NEW.pipeline_stage_id = '76eb2e82-e1d9-4f2d-a57d-2120a25696db'::uuid 
       AND NEW.active_at IS NULL THEN
      NEW.active_at = now();
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to stamp stage timestamps
DROP TRIGGER IF EXISTS set_stage_timestamps ON leads;
CREATE TRIGGER set_stage_timestamps
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION stamp_stage_timestamps();

-- Add unique constraint on team_assignments to fix upsert conflict
ALTER TABLE team_assignments 
DROP CONSTRAINT IF EXISTS team_assignments_lead_role_unique;

ALTER TABLE team_assignments 
ADD CONSTRAINT team_assignments_lead_role_unique 
UNIQUE (lead_id, role);