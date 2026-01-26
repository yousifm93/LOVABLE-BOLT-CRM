-- Backfill idle_moved_at for existing idle leads
-- Using updated_at as the best approximation of when they were moved
UPDATE leads 
SET idle_moved_at = COALESCE(updated_at, NOW())
WHERE pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'
  AND idle_moved_at IS NULL;