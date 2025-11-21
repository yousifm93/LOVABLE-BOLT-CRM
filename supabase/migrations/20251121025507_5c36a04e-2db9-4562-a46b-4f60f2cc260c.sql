-- Create trigger function for EPO status changes
CREATE OR REPLACE FUNCTION public.execute_epo_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if epo_status actually changed
  IF OLD.epo_status IS DISTINCT FROM NEW.epo_status THEN
    -- Loop through active automations for epo_status changes
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'epo_status'
        AND trigger_config->>'target_status' = NEW.epo_status::text
    LOOP
      BEGIN
        -- Create the task with correct column names: borrower_id and assignee_id
        INSERT INTO public.tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          priority,
          due_date,
          status,
          created_by
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          automation.created_by
        )
        RETURNING id INTO new_task_id;

        -- Log successful execution
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
        -- Log failed execution
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for EPO status changes
CREATE TRIGGER trigger_epo_status_changed_automations
  AFTER UPDATE OF epo_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_epo_status_changed_automations();

-- Create trigger function for Package status changes
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if package_status actually changed
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    -- Loop through active automations for package_status changes
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'package_status'
        AND trigger_config->>'target_status' = NEW.package_status::text
    LOOP
      BEGIN
        -- Create the task with correct column names: borrower_id and assignee_id
        INSERT INTO public.tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          priority,
          due_date,
          status,
          created_by
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          automation.created_by
        )
        RETURNING id INTO new_task_id;

        -- Log successful execution
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
        -- Log failed execution
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for Package status changes
CREATE TRIGGER trigger_package_status_changed_automations
  AFTER UPDATE OF package_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_package_status_changed_automations();

-- Create trigger function for Loan Amount changes (conditional on disclosure_status = 'Signed')
CREATE OR REPLACE FUNCTION public.execute_loan_amount_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if loan_amount changed AND disclosure_status is 'Signed'
  IF OLD.loan_amount IS DISTINCT FROM NEW.loan_amount AND NEW.disclosure_status = 'Signed' THEN
    -- Loop through active automations for loan_amount changes
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'loan_amount'
    LOOP
      BEGIN
        -- Create the task with correct column names: borrower_id and assignee_id
        INSERT INTO public.tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          priority,
          due_date,
          status,
          created_by
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          automation.created_by
        )
        RETURNING id INTO new_task_id;

        -- Log successful execution
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
        -- Log failed execution
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for Loan Amount changes
CREATE TRIGGER trigger_loan_amount_changed_automations
  AFTER UPDATE OF loan_amount ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_loan_amount_changed_automations();

-- Seed 5 new automation records (all assigned to Yousif Mohamed)
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
  created_by
) VALUES
  -- 1. EPO Status → "Send"
  (
    'Send EPO to BRWR',
    'status_changed',
    '{"field": "epo_status", "target_status": "Send"}'::jsonb,
    'Send EPO to BRWR',
    'Send the EPO to the borrower',
    '08e73d69-4707-4773-84a4-69ce2acd6a11',
    'Medium',
    0,
    true,
    '08e73d69-4707-4773-84a4-69ce2acd6a11'
  ),
  -- 2. Package Status → "Final" (First)
  (
    'PKG Finalized- Call BA',
    'status_changed',
    '{"field": "package_status", "target_status": "Final"}'::jsonb,
    'PKG Finalized- Call BA',
    'Call the buyer''s agent about finalized package',
    '08e73d69-4707-4773-84a4-69ce2acd6a11',
    'Medium',
    0,
    true,
    '08e73d69-4707-4773-84a4-69ce2acd6a11'
  ),
  -- 3. Package Status → "Final" (Second)
  (
    'Package Final- Final Client Call',
    'status_changed',
    '{"field": "package_status", "target_status": "Final"}'::jsonb,
    'Package Final- Final Client Call',
    'Final client call for finalized package',
    '08e73d69-4707-4773-84a4-69ce2acd6a11',
    'Medium',
    0,
    true,
    '08e73d69-4707-4773-84a4-69ce2acd6a11'
  ),
  -- 4. Appraisal Status → "Scheduled"
  (
    'Appraisal Scheduled- Call BA',
    'status_changed',
    '{"field": "appraisal_status", "target_status": "Scheduled"}'::jsonb,
    'Appraisal Scheduled- Call BA',
    'Call the buyer''s agent about scheduled appraisal',
    '08e73d69-4707-4773-84a4-69ce2acd6a11',
    'Medium',
    0,
    true,
    '08e73d69-4707-4773-84a4-69ce2acd6a11'
  ),
  -- 5. Loan Amount changes (conditional on Disc Status = 'Signed')
  (
    'Loan Amount Change- Update All Parties',
    'status_changed',
    '{"field": "loan_amount"}'::jsonb,
    'Loan Amount Change- Update All Parties',
    'Update all parties about the loan amount change',
    '08e73d69-4707-4773-84a4-69ce2acd6a11',
    'Medium',
    0,
    true,
    '08e73d69-4707-4773-84a4-69ce2acd6a11'
  );