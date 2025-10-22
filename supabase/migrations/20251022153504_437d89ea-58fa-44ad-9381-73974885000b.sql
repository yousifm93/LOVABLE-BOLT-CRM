-- Reorganize leads for testing - with CASCADE delete for tasks
-- Move first 10 leads to Pending App
WITH numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num FROM leads
)
UPDATE leads SET pipeline_stage_id = '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945', pipeline_section = NULL
WHERE id IN (SELECT id FROM numbered_leads WHERE row_num BETWEEN 1 AND 10);

-- Move next 10 leads to Screening
WITH numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num FROM leads
)
UPDATE leads SET pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995', pipeline_section = NULL
WHERE id IN (SELECT id FROM numbered_leads WHERE row_num BETWEEN 11 AND 20);

-- Move next 10 leads to Pre-Qualified
WITH numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num FROM leads
)
UPDATE leads SET pipeline_stage_id = '09162eec-d2b2-48e5-86d0-9e66ee8b2af7', pipeline_section = NULL
WHERE id IN (SELECT id FROM numbered_leads WHERE row_num BETWEEN 21 AND 30);

-- Move next 10 leads to Pre-Approved
WITH numbered_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num FROM leads
)
UPDATE leads SET pipeline_stage_id = '3cbf38ff-752e-4163-a9a3-1757499b4945', pipeline_section = NULL
WHERE id IN (SELECT id FROM numbered_leads WHERE row_num BETWEEN 31 AND 40);

-- Delete tasks first, then delete leads from Active sections
WITH numbered_active_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM leads WHERE pipeline_section IN ('Live', 'Incoming', 'On Hold')
)
DELETE FROM tasks WHERE borrower_id IN (SELECT id FROM numbered_active_leads WHERE row_num BETWEEN 11 AND 50);

WITH numbered_active_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM leads WHERE pipeline_section IN ('Live', 'Incoming', 'On Hold')
)
DELETE FROM leads WHERE id IN (SELECT id FROM numbered_active_leads WHERE row_num BETWEEN 11 AND 50);