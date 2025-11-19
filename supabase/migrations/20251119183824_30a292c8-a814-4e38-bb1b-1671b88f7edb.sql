-- Update all four appraisal automations to assign to Yousif Mohamed
UPDATE public.task_automations
SET assigned_to_user_id = '08e73d69-4707-4773-84a4-69ce2acd6a11'
WHERE trigger_type = 'status_changed'
  AND trigger_config->>'field' = 'appraisal_status'
  AND assigned_to_user_id IS NULL;