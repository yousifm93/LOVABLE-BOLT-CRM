-- Update subcategory constraint to allow 'other'
ALTER TABLE task_automations DROP CONSTRAINT IF EXISTS task_automations_subcategory_check;
ALTER TABLE task_automations ADD CONSTRAINT task_automations_subcategory_check 
  CHECK (subcategory IN ('appraisal', 'closing', 'submission', 'other'));

-- Add "Finalize Closing Package" automation (CTC status change)
INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active,
  category, subcategory, created_by
)
VALUES (
  'Finalize Closing Package',
  'status_changed',
  '{"field": "loan_status", "target_status": "CTC"}'::jsonb,
  'Finalize Closing Package',
  'Review and finalize all closing documents',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'Medium',
  0,
  true,
  'active_loan',
  'closing',
  '08e73d69-4707-4773-84a4-69ce2acd6a11'
);

-- Add "Rate Lock" automation (30 days before close_date when loan_status = SUB)
INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active,
  category, subcategory, created_by
)
VALUES (
  'Rate Lock',
  'date_based',
  '{"date_field": "close_date", "days_offset": -30, "condition_field": "loan_status", "condition_value": "SUB", "condition_operator": "equals"}'::jsonb,
  'Rate Lock',
  'Lock the rate for the loan - close date is within 30 days',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  0,
  true,
  'active_loan',
  'other',
  '08e73d69-4707-4773-84a4-69ce2acd6a11'
);

-- Create function to execute automations when loan_status changes to CTC
CREATE OR REPLACE FUNCTION public.execute_loan_status_ctc_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status AND NEW.loan_status = 'CTC' THEN
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'loan_status'
        AND trigger_config->>'target_status' = 'CTC'
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
$$;

-- Create trigger for loan_status CTC changes
DROP TRIGGER IF EXISTS tr_loan_status_ctc_automation ON public.leads;
CREATE TRIGGER tr_loan_status_ctc_automation
AFTER UPDATE OF loan_status ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.execute_loan_status_ctc_changed_automations();