-- Drop the existing check constraint
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_pipeline_section_check;

-- Add new check constraint that includes 'Closed'
ALTER TABLE leads 
ADD CONSTRAINT leads_pipeline_section_check 
CHECK (pipeline_section = ANY (ARRAY['Live'::text, 'Incoming'::text, 'On Hold'::text, 'Closed'::text]));

-- Add is_closed boolean column with default false
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false;

-- Add closed_at timestamp column
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- Update 3 sample loans to be past clients
UPDATE leads 
SET 
  pipeline_section = 'Closed',
  is_closed = true,
  closed_at = '2025-10-15 14:30:00+00'
WHERE id = (SELECT id FROM leads WHERE pipeline_section = 'Live' LIMIT 1);

UPDATE leads 
SET 
  pipeline_section = 'Closed',
  is_closed = true,
  closed_at = '2025-10-20 16:45:00+00'
WHERE id = (SELECT id FROM leads WHERE pipeline_section = 'Live' OFFSET 1 LIMIT 1);

UPDATE leads 
SET 
  pipeline_section = 'Closed',
  is_closed = true,
  closed_at = '2025-10-22 10:15:00+00'
WHERE id = (SELECT id FROM leads WHERE pipeline_section = 'Live' OFFSET 2 LIMIT 1);