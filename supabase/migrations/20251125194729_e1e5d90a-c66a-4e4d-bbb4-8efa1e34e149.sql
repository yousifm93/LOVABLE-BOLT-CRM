-- Move "Closing Date Changed - Update All Parties/Systems" to Closing subcategory
UPDATE task_automations 
SET subcategory = 'closing' 
WHERE name ILIKE '%Closing Date Changed%';

-- Move "Disc Sent - Call BRWR" to Submission subcategory
UPDATE task_automations 
SET subcategory = 'submission' 
WHERE name ILIKE '%Disc Sent%';