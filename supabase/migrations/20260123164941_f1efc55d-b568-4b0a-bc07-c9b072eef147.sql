-- Update subcategory constraint to include 'conditions' and insert the automation
ALTER TABLE public.task_automations DROP CONSTRAINT IF EXISTS task_automations_subcategory_check;

ALTER TABLE public.task_automations ADD CONSTRAINT task_automations_subcategory_check 
  CHECK (subcategory = ANY (ARRAY['appraisal'::text, 'closing'::text, 'submission'::text, 'other'::text, 'conditions'::text]));

INSERT INTO public.task_automations (
  name,
  task_name,
  task_description,
  trigger_type,
  trigger_config,
  is_active,
  category,
  subcategory,
  task_priority
) VALUES (
  'Check Overdue Conditions',
  'Overdue Conditions Follow-up',
  'Automatically created task when loan conditions pass their due date. Assigned to the lead''s teammate.',
  'scheduled',
  '{"schedule": "0 6 * * *", "schedule_description": "Daily at 6:00 AM"}'::jsonb,
  true,
  'active_loan',
  'conditions',
  'Medium'
);