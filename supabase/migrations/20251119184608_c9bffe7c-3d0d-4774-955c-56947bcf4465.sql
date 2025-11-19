-- Update appraisal automation task names and descriptions to proper case
UPDATE public.task_automations
SET 
  task_name = 'Appraisal received - Call buyer''s agent',
  task_description = 'Call buyers agent to let them know the appraisal has been received'
WHERE trigger_config->>'field' = 'appraisal_status'
  AND trigger_config->>'target_status' = 'Received'
  AND task_name ILIKE '%CALL BA%';

UPDATE public.task_automations
SET 
  task_name = 'Appraisal received - Notify all parties',
  task_description = 'Send out all parties the appraised value after it has been received'
WHERE trigger_config->>'field' = 'appraisal_status'
  AND trigger_config->>'target_status' = 'Received'
  AND task_name ILIKE '%NOTIFY ALL PARTIES%';

UPDATE public.task_automations
SET 
  task_name = 'Appraisal scheduled - Call listing agent',
  task_description = 'Call listing agent to let them know the appraisal has been scheduled'
WHERE trigger_config->>'field' = 'appraisal_status'
  AND trigger_config->>'target_status' = 'Scheduled'
  AND task_name ILIKE '%CALL LA%';

UPDATE public.task_automations
SET 
  task_name = 'Appraisal scheduled - Update appraisal time',
  task_description = 'Send out the appraisal schedule information to all parties'
WHERE trigger_config->>'field' = 'appraisal_status'
  AND trigger_config->>'target_status' = 'Scheduled'
  AND task_name ILIKE '%UPDATE TIME%';