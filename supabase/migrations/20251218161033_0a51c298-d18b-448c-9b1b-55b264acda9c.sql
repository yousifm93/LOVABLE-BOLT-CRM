-- First delete tasks linked to soft-deleted Past Client leads
DELETE FROM tasks 
WHERE borrower_id IN (
  SELECT id FROM leads 
  WHERE pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
    AND deleted_at IS NOT NULL
);

-- Then hard delete the soft-deleted Past Client leads
DELETE FROM leads 
WHERE pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
  AND deleted_at IS NOT NULL;