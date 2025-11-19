-- Update all existing 'Requested' values to 'Ordered'
UPDATE leads 
SET title_status = 'Ordered' 
WHERE title_status = 'Requested';