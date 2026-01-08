-- Add notes column to email_field_suggestions table
ALTER TABLE email_field_suggestions ADD COLUMN IF NOT EXISTS notes text;

-- Update task automations to use correct Yousif Mohamed ID
UPDATE task_automations 
SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE task_name IN (
  'Email mortgage Monday',
  'Send out condo marketing', 
  'Choose featured agents',
  'Complete Friday newsletter',
  'New pre-approved borrower call',
  'Past client call',
  'New pre-approved borrower - Call Buyer''s Agent'
)
AND assigned_to_user_id = '08e73d69-4707-4773-84a4-69ce2acd6a11';

-- Also add a teammate_assigned_ids column to leads for multi-user assignment
ALTER TABLE leads ADD COLUMN IF NOT EXISTS teammate_assigned_ids uuid[] DEFAULT '{}'::uuid[];