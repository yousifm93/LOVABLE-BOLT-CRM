-- Update close date changed automation to use lead's teammate_assigned dynamically
CREATE OR REPLACE FUNCTION public.execute_close_date_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  assignee_id_value uuid;
BEGIN
  IF OLD.close_date IS DISTINCT FROM NEW.close_date AND NEW.disclosure_status = 'Signed' THEN
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE is_active = true 
        AND trigger_type = 'status_changed' 
        AND trigger_config->>'field' = 'close_date'
        AND (trigger_config->>'condition') IS NULL
    LOOP
      BEGIN
        -- Use lead's teammate_assigned, fallback to automation's assigned_to_user_id
        assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
        
        INSERT INTO public.tasks (
          title, description, borrower_id, assignee_id, priority, 
          due_date, status, created_by, completion_requirement_type
        )
        VALUES (
          automation.task_name, 
          automation.task_description, 
          NEW.id, 
          assignee_id_value,
          automation.task_priority::task_priority, 
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it', 
          automation.created_by, 
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;
        
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation.id, NEW.id, NULL, NOW(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;