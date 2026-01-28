-- Fix the appraisal status trigger function to use correct trigger_type and column name
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    -- Get user ID from JWT
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
        AND ta.trigger_config->>'field' = 'appraisal_status'
        AND ta.trigger_config->>'target_status' = NEW.appraisal_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'Open',
        v_user_id,
        automation.id
      );

      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_created,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        true,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;