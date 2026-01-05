-- Delete test agent call records
DELETE FROM agent_call_logs 
WHERE id IN (
  '2ae07ceb-c3b9-426b-be29-07b8573cf837',
  'fde7b8c8-41c9-4a4b-8dba-041c54d629d1',
  '77fdb379-7733-43cb-a35e-250073530f54',
  '8b7be1de-fe6b-4adf-88ab-b4a592bd7579'
);

-- Fix task automation text: remove plural 's'
UPDATE task_automations 
SET task_name = 'Follow up on new lead',
    name = 'Follow up on new lead'
WHERE id = '30c8ebeb-b9e0-4347-b541-0e2eb755ac2a';