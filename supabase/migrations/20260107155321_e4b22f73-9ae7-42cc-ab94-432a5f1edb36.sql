-- Fix existing Active leads with NULL pipeline_section - default them to 'Incoming'
UPDATE leads 
SET pipeline_section = 'Incoming'
WHERE pipeline_stage_id = '76eb2e82-e1d9-4f2d-a57d-2120a25696db'
  AND pipeline_section IS NULL;