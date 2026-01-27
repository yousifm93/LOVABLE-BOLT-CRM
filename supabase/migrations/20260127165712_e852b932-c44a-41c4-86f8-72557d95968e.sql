-- Issue 1: Fix case-insensitive comparison in loan_status trigger
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
BEGIN
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'loan_status'
        AND LOWER(ta.trigger_config->>'target_status') = LOWER(NEW.loan_status::text)
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
          completion_requirement_type,
          automation_id
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          v_user_id,
          COALESCE(automation.completion_requirement_type, 'none'),
          automation.id
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

-- Issue 2: Update Call tasks to be assigned to Yousif Mohamed (230ccf6d-48f5-4f3c-89fd-f2907ebdba1e)
UPDATE task_automations 
SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE task_name = 'Call Borrower - New Active File';

UPDATE task_automations 
SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE task_name = 'Call Buyers Agent - New Active File';