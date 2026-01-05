-- Add columns to track previous stage when moving to Idle
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS idle_previous_stage_id UUID NULL,
ADD COLUMN IF NOT EXISTS idle_previous_stage_name TEXT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.leads.idle_previous_stage_id IS 'Pipeline stage ID before moving to Idle';
COMMENT ON COLUMN public.leads.idle_previous_stage_name IS 'Pipeline stage name before moving to Idle (denormalized for quick display)';

-- Backfill existing idle leads with "Leads" as previous stage (since most came from there)
UPDATE public.leads 
SET idle_previous_stage_name = 'Leads'
WHERE pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'
  AND idle_previous_stage_name IS NULL;