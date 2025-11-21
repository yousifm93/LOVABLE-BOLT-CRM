-- Add category column to task_automations
ALTER TABLE task_automations
  ADD COLUMN category text;

-- Add check constraint for valid categories
ALTER TABLE task_automations
  ADD CONSTRAINT task_automations_category_check
  CHECK (category IN ('marketing', 'lead_status', 'active_loan'));

-- Update existing automations with categories based on their names

-- Marketing automations (1-6)
UPDATE task_automations SET category = 'marketing' WHERE name IN (
  'Choose featured agents',
  'Email mortgage Monday',
  'Complete Friday newsletter',
  'Update all contacts and email campaigns',
  'Send out condo marketing',
  'Update condo list'
);

-- Lead status automations (7-9, 13-14, 32)
UPDATE task_automations SET category = 'lead_status' WHERE name IN (
  'Follow up on new lead',
  'Follow up on pending app',
  'Screen new application',
  'New pre-qualified (Pre-Qual Approval Email)',
  'New pre-qualified (Upload initial approval)',
  'Past client call'
);

-- Active loan automations (all others: 11-12, 15-31)
UPDATE task_automations SET category = 'active_loan' WHERE category IS NULL;