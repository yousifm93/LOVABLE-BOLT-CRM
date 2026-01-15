-- Fix execute_extend_rate_lock_automation to properly cast priority and status enums
CREATE OR REPLACE FUNCTION public.execute_extend_rate_lock_automation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id UUID;
BEGIN
  -- Only run if close_date changed and is after lock_expiration_date
  IF (TG_OP = 'UPDATE' AND 
      NEW.close_date IS DISTINCT FROM OLD.close_date AND
      NEW.close_date IS NOT NULL AND
      NEW.lock_expiration_date IS NOT NULL AND
      NEW.close_date > NEW.lock_expiration_date AND
      NEW.disclosure_status = 'Signed') THEN
    
    -- Find active extend rate lock automations
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'extend_rate_lock'
        AND ta.pipeline_group = 'active'
    LOOP
      BEGIN
        -- Create the task with proper enum casts
        INSERT INTO tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          priority,
          status,
          due_date,
          created_by
        ) VALUES (
          COALESCE(automation.task_name, 'Extend Rate Lock'),
          COALESCE(automation.task_description, 'Rate lock needs to be extended - closing date is after lock expiration'),
          NEW.id,
          automation.assigned_to_user_id,
          COALESCE(automation.task_priority, 'High')::task_priority,
          'Working on it'::task_status,
          COALESCE(NEW.close_date, CURRENT_DATE + INTERVAL '3 days'),
          automation.created_by
        )
        RETURNING id INTO new_task_id;

        -- Log successful execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success
        ) VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          NOW(),
          true
        );

        -- Update automation last_run_at
        UPDATE task_automations
        SET last_run_at = NOW(),
            execution_count = COALESCE(execution_count, 0) + 1
        WHERE id = automation.id;

      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution with error message
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          error_message
        ) VALUES (
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