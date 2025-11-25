-- Add new enum values to loan_status
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'Closed';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'Needs Support';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'New Lead';

-- Create function to execute loan_status changed automations
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'loan_status'
        AND trigger_config->>'target_status' = NEW.loan_status::text
    LOOP
      BEGIN
        INSERT INTO public.tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          priority,
          due_date,
          status,
          created_by,
          completion_requirement_type
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          automation.created_by,
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;

        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success
        )
        VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          NOW(),
          true
        );

      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          error_message
        )
        VALUES (
          automation.id,
          NEW.id,
          NULL,
          NOW(),
          false,
          SQLERRM
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for loan_status changes
DROP TRIGGER IF EXISTS trigger_loan_status_changed_automations ON public.leads;
CREATE TRIGGER trigger_loan_status_changed_automations
  AFTER UPDATE OF loan_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_loan_status_changed_automations();

-- Insert the 4 new Past Client automations
INSERT INTO public.task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  assigned_to_user_id,
  task_priority,
  due_date_offset_days,
  is_active,
  created_by,
  category,
  subcategory
) VALUES
-- 1. Day After Closing Call (1 day after close_date)
(
  'Day After Closing Call',
  'date_based',
  '{"date_field": "close_date", "days_offset": 1}'::jsonb,
  'Post Close Date - Call (BRWR)',
  'Call borrower the day after closing to check in',
  '08e73d69-4707-4773-84a4-69ce2acd6a11', -- Yousif Mohamed
  'Medium',
  0,
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'past_client',
  NULL
),
-- 2. 21 Days Post Close Date Call (21 days after close_date)
(
  '21 Days Post Close Date Call',
  'date_based',
  '{"date_field": "close_date", "days_offset": 21}'::jsonb,
  '21 Days Post Close Date - Call (BRWR)',
  'Follow up with borrower 21 days after closing',
  '08e73d69-4707-4773-84a4-69ce2acd6a11', -- Yousif Mohamed
  'Medium',
  0,
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'past_client',
  NULL
),
-- 3. 90 Days Post Close Call (90 days after close_date)
(
  '90 Days Post Close Call',
  'date_based',
  '{"date_field": "close_date", "days_offset": 90}'::jsonb,
  '90 Day Post Close Call - Call BRWR, Set Next PC Date',
  'Follow up with borrower 90 days after closing and schedule next contact',
  '08e73d69-4707-4773-84a4-69ce2acd6a11', -- Yousif Mohamed
  'Medium',
  0,
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'past_client',
  NULL
),
-- 4. Status Changes to Needs Support
(
  'Status Changes to Needs Support',
  'status_changed',
  '{"field": "loan_status", "target_status": "Needs Support"}'::jsonb,
  'Past Client Needs Support',
  'Past client requires assistance - follow up immediately',
  '08e73d69-4707-4773-84a4-69ce2acd6a11', -- Yousif Mohamed
  'High',
  0,
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'past_client',
  NULL
);