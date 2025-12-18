
-- Soft-delete pre-existing Past Client records (before today's import)
UPDATE leads 
SET deleted_at = NOW(),
    deleted_by = 'b06a12ea-00b9-4725-b368-e8a416d4028d'
WHERE pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
  AND created_at < '2025-12-18 15:48:00'
  AND deleted_at IS NULL;
