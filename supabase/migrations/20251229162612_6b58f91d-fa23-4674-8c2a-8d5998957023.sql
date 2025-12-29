-- Clear lead_on_date for past clients with December 2024 dates
-- Set to their close_date if available, otherwise to Jan 1, 2020 (historical placeholder)
UPDATE leads 
SET lead_on_date = COALESCE(close_date, '2020-01-01')
WHERE pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
  AND lead_on_date >= '2024-12-01';

-- Clear app_complete_at for test applications in December 2024
UPDATE leads 
SET app_complete_at = NULL 
WHERE app_complete_at >= '2024-12-01';