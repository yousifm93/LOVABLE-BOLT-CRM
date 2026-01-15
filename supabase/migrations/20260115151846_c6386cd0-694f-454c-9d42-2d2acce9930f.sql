-- Fix the lead creation trigger with CORRECT column names from task_automations table
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  assignee_id_value UUID;
  due_date_value TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Prevent recursive execution (safeguard)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Skip Screening stage leads
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995' THEN
    RETURN NEW;
  END IF;

  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    BEGIN
      -- Calculate due date from offset
      IF automation.due_date_offset_days IS NOT NULL THEN
        due_date_value := NOW() + (automation.due_date_offset_days || ' days')::INTERVAL;
      ELSE
        due_date_value := NULL;
      END IF;

      -- Get assignee: use automation's assigned_to_user_id or fall back to lead's teammate_assigned
      assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);

      INSERT INTO public.tasks (
        title,
        description,
        borrower_id,
        assignee_id,
        status,
        priority,
        due_date,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation.task_name,
        automation.task_description,
        NEW.id,
        assignee_id_value,
        'To Do'::task_status,
        COALESCE(automation.task_priority::text, 'Medium')::task_priority,
        due_date_value,
        NEW.created_by,
        automation.completion_requirement_type
      )
      RETURNING id INTO new_task_id;

      -- Log successful execution to task_automation_executions table
      INSERT INTO task_automation_executions (
        automation_id, lead_id, task_id, success, executed_at
      ) VALUES (
        automation.id, NEW.id, new_task_id, true, NOW()
      );

    EXCEPTION WHEN OTHERS THEN
      -- Log failed execution
      INSERT INTO task_automation_executions (
        automation_id, lead_id, success, error_message, executed_at
      ) VALUES (
        automation.id, NEW.id, false, SQLERRM, NOW()
      );
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;