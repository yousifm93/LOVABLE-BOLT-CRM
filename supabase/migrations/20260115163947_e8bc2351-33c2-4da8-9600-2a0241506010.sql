-- Delete the "New active file - Onboard and disclose" task automation
DELETE FROM task_automations WHERE id = '779c31ab-e6b2-4b5d-afa6-ce3addb46213';

-- Create new "Disclose" task automation that triggers when loan_status changes to "New"
INSERT INTO task_automations (
  name,
  task_name,
  task_description,
  assigned_to_user_id,
  trigger_type,
  trigger_config,
  task_priority,
  is_active,
  category,
  created_by
) VALUES (
  'Disclose New Client',
  'Disclose',
  'Prepare and send disclosures to the new client',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee',
  'status_changed',
  '{"field": "loan_status", "target_status": "New"}',
  'High',
  true,
  'active_loan',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'
);