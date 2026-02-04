-- Update the execute_loan_status_changed_automations trigger to allow re-creation
-- of tasks if the previous matching task is older than 30 days

CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  automation_record RECORD;
  v_fallback_user_id uuid := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'; -- Herman's public user ID
  v_assignee_id uuid;
  v_new_task_id uuid;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- Find matching automations for this loan_status change
  FOR automation_record IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'loan_status_changed'
      AND ta.trigger_config->>'loan_status' = NEW.loan_status::text
  LOOP
    -- Determine assignee: use automation config or fallback
    v_assignee_id := NULL;
    
    IF automation_record.trigger_config->>'assignee_user_id' IS NOT NULL 
       AND automation_record.trigger_config->>'assignee_user_id' != '' THEN
      v_assignee_id := (automation_record.trigger_config->>'assignee_user_id')::uuid;
    ELSIF NEW.teammate_assigned IS NOT NULL THEN
      v_assignee_id := NEW.teammate_assigned;
    ELSE
      v_assignee_id := v_fallback_user_id;
    END IF;

    -- Check for duplicate prevention: skip if matching task exists, is not Done, 
    -- AND was created within the last 30 days
    IF NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND t.title = automation_record.task_name
        AND t.status::text NOT IN ('Done')
        AND t.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days')
    ) THEN
      -- Create the task
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        assignee_id,
        status,
        priority,
        automation_id
      ) VALUES (
        automation_record.task_name,
        COALESCE(automation_record.task_description, ''),
        NEW.id,
        v_assignee_id,
        'To Do'::task_status,
        COALESCE(automation_record.priority, 'Medium')::task_priority,
        automation_record.id
      )
      RETURNING id INTO v_new_task_id;

      -- Log the execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        success,
        executed_at
      ) VALUES (
        automation_record.id,
        NEW.id,
        v_new_task_id,
        true,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;