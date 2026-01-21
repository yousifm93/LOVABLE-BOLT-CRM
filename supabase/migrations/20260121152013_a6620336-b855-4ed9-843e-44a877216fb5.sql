-- Update task automations to assign to Ashley instead of Herman
-- F/U Initial Approval and Submit File tasks
UPDATE task_automations 
SET assigned_to_user_id = '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a'
WHERE id IN (
  'e4722888-20ba-45b4-bedd-71edc7f55409',  -- F/U Initial Approval
  '0765c279-0bab-434b-a468-e6355a14f822'   -- Submit File
);