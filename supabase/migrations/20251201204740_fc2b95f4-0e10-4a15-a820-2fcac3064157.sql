-- Clean up duplicate appraisal documents for Diana Alzate
-- Keep only the most recent one and delete the rest
DELETE FROM documents 
WHERE lead_id = 'cd14244c-d1bb-4b40-afcc-fb9c5a520e19'
  AND file_name LIKE 'Appraisal Report%'
  AND id NOT IN (
    SELECT id FROM documents 
    WHERE lead_id = 'cd14244c-d1bb-4b40-afcc-fb9c5a520e19'
      AND file_name LIKE 'Appraisal Report%'
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Update the remaining document with correct file size (2.3MB = 2,400,000 bytes)
UPDATE documents 
SET size_bytes = 2400000
WHERE lead_id = 'cd14244c-d1bb-4b40-afcc-fb9c5a520e19'
  AND file_name LIKE 'Appraisal Report%';