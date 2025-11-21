-- Drop existing functions (CASCADE will drop the triggers too)
DROP FUNCTION IF EXISTS public.execute_disclosure_status_changed_automations() CASCADE;
DROP FUNCTION IF EXISTS public.execute_loan_status_changed_automations() CASCADE;
DROP FUNCTION IF EXISTS public.execute_close_date_changed_automations() CASCADE;

-- Recreate disclosure status automation function with correct column names
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if disclosure_status actually changed
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    -- Loop through active automations for disclosure_status changes
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'disclosure_status'
        AND trigger_config->>'target_status' = NEW.disclosure_status::text
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

-- Recreate loan status automation function with correct column names
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    -- Loop through active automations for loan_status changes
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'loan_status'
        AND trigger_config->>'target_status' = NEW.loan_status::text
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

-- Recreate close date automation function with correct column names (conditional on disclosure_status)
CREATE OR REPLACE FUNCTION public.execute_close_date_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if close_date actually changed AND disclosure_status is 'Signed'
  IF OLD.close_date IS DISTINCT FROM NEW.close_date AND NEW.disclosure_status = 'Signed' THEN
    -- Loop through active automations for close_date changes
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'close_date'
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

-- Recreate the triggers
CREATE TRIGGER trigger_disclosure_status_changed_automations
  AFTER UPDATE OF disclosure_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_disclosure_status_changed_automations();

CREATE TRIGGER trigger_loan_status_changed_automations
  AFTER UPDATE OF loan_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_loan_status_changed_automations();

CREATE TRIGGER trigger_close_date_changed_automations
  AFTER UPDATE OF close_date ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_close_date_changed_automations();