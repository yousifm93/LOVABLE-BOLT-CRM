-- Update the "Disclose" task automation to have subcategory = 'submission'
-- so it appears alongside "On-Board New Client" in the admin dashboard
UPDATE task_automations 
SET subcategory = 'submission' 
WHERE id = '71f663f2-5a0f-4005-86ad-ad761a063298';