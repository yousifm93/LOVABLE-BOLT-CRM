-- Update all existing Past Clients to have pipeline_section = 'Closed'
UPDATE leads 
SET pipeline_section = 'Closed' 
WHERE is_closed = true 
AND pipeline_section IS NULL;