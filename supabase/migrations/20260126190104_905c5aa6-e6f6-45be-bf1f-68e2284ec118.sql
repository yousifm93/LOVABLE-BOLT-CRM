-- Add client_rating column to leads for past clients rating
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_rating TEXT;

-- Add idle_moved_at column to track when lead moved to idle
ALTER TABLE leads ADD COLUMN IF NOT EXISTS idle_moved_at TIMESTAMPTZ;

-- Create trigger function to auto-set idle_moved_at
CREATE OR REPLACE FUNCTION set_idle_moved_at()
RETURNS TRIGGER AS $$
BEGIN
  -- When moving TO idle stage (5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a)
  IF NEW.pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'::uuid 
     AND (OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id) THEN
    NEW.idle_moved_at = NOW();
  END IF;
  -- When moving OUT OF idle stage, clear the timestamp
  IF OLD.pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'::uuid 
     AND NEW.pipeline_stage_id != '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'::uuid THEN
    NEW.idle_moved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for idle timestamp
DROP TRIGGER IF EXISTS trigger_set_idle_moved_at ON leads;
CREATE TRIGGER trigger_set_idle_moved_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_idle_moved_at();

-- Create lender_documents table for file attachments
CREATE TABLE IF NOT EXISTS lender_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID REFERENCES lenders(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lender_documents
ALTER TABLE lender_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for lender_documents
CREATE POLICY "Team members can view lender documents"
  ON lender_documents FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert lender documents"
  ON lender_documents FOR INSERT
  WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can update lender documents"
  ON lender_documents FOR UPDATE
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can delete lender documents"
  ON lender_documents FOR DELETE
  USING (is_team_member(auth.uid()));

-- Add updated_at trigger for lender_documents
CREATE TRIGGER update_lender_documents_updated_at
BEFORE UPDATE ON lender_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();