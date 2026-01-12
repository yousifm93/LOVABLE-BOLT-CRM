-- Add 'tasks' to the column_order for Main View in Active Pipeline
UPDATE pipeline_views 
SET column_order = column_order || '["tasks"]'::jsonb
WHERE id = '07743847-192e-4d97-82f7-b3e23ffb86d7'
AND NOT (column_order @> '"tasks"'::jsonb);