-- Add document upload completion requirements to task automations
UPDATE task_automations SET completion_requirement_type = 'field_populated:initial_approval_file' WHERE id = '4923b0ad-24af-4bd1-a3e1-74873297a0a9';
UPDATE task_automations SET completion_requirement_type = 'field_populated:disc_file' WHERE id = 'b33fd14f-4e26-4572-9790-317e808bf201';
UPDATE task_automations SET completion_requirement_type = 'field_populated:appraisal_file' WHERE id = '8e5fac1e-3e25-4619-a1bc-47cab86ecfc3';
UPDATE task_automations SET completion_requirement_type = 'field_populated:insurance_file' WHERE id = '6664d19b-b759-4ec5-81d2-a5f1c26411c5';
UPDATE task_automations SET completion_requirement_type = 'field_populated:icd_file' WHERE id = '1989c025-9e9a-4079-a22e-cf4a62347305';
UPDATE task_automations SET completion_requirement_type = 'field_populated:fcp_file' WHERE id = 'b096eac9-411d-4c19-bf95-d41c0e019d8c';
UPDATE task_automations SET completion_requirement_type = 'field_populated:title_file' WHERE id = '53ecae35-e37b-47aa-a23b-0acc0cfbe6c9';
UPDATE task_automations SET completion_requirement_type = 'field_populated:rate_lock_file' WHERE id = 'e5f492a2-ac6f-40c0-9ff2-d0789c9717b2';
UPDATE task_automations SET completion_requirement_type = 'field_populated:condo_docs_file' WHERE id = '112aab7f-89a5-4f7a-ae08-d138442a1db6';

-- Also update any existing open tasks created from these automations
UPDATE tasks SET completion_requirement_type = 'field_populated:initial_approval_file' 
WHERE title = 'Upload initial approval' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:disc_file' 
WHERE title = 'Upload disclosure document' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:appraisal_file' 
WHERE title = 'Upload appraisal document' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:insurance_file' 
WHERE title = 'Upload HOI policy' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:icd_file' 
WHERE title = 'Upload CD' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:fcp_file' 
WHERE title = 'Upload final closing package' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:title_file' 
WHERE title = 'Upload title work' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:rate_lock_file' 
WHERE title = 'Upload rate confirmation' AND status != 'Done';

UPDATE tasks SET completion_requirement_type = 'field_populated:condo_docs_file' 
WHERE title = 'Upload condo docs' AND status != 'Done';