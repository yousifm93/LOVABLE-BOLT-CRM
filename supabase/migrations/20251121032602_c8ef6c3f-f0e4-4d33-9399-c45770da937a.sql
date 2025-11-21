-- Fix all unassigned task automations to be assigned to Yousif Mohamed
UPDATE task_automations
SET assigned_to_user_id = '08e73d69-4707-4773-84a4-69ce2acd6a11'
WHERE assigned_to_user_id IS NULL;