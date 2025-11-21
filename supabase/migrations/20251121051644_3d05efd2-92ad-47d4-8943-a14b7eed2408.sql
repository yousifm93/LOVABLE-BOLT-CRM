-- Update remaining status change automation functions

-- execute_close_date_changed_automations
CREATE OR REPLACE FUNCTION public.execute_close_date_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  IF OLD.close_date IS DISTINCT FROM NEW.close_date AND NEW.disclosure_status = 'Signed' THEN
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'close_date'
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

-- execute_epo_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_epo_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  IF OLD.epo_status IS DISTINCT FROM NEW.epo_status THEN
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'epo_status'
        AND trigger_config->>'target_status' = NEW.epo_status::text
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