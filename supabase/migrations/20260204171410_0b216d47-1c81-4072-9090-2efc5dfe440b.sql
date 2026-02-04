CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  task_count INT;
BEGIN
  -- Only run when loan_status changes
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- Iterate through matching task automations
  FOR automation IN
    SELECT id, name, task_name, task_priority, assigned_to_user_id, trigger_config
    FROM task_automations
    WHERE trigger_type = 'status_changed'
      AND (trigger_config->>'field')::text = 'loan_status'
      AND (trigger_config->>'target_status')::text = NEW.loan_status::text
      AND is_active = true
  LOOP
    -- Check for duplicate incomplete tasks
    SELECT COUNT(*) INTO task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND automation_id = automation.id
      AND task_status::text NOT IN ('Done')
      AND created_at > NOW() - INTERVAL '14 days';

    IF task_count > 0 THEN
      CONTINUE;
    END IF;

    -- Create the task
    INSERT INTO tasks (
      borrower_id,
      automation_id,
      title,
      task_status,
      priority,
      created_at,
      assignee_id
    ) VALUES (
      NEW.id,
      automation.id,
      automation.task_name,
      'To Do'::task_status,
      COALESCE(automation.task_priority, 'Medium')::task_priority,
      NOW(),
      COALESCE(automation.assigned_to_user_id, (SELECT assignee_id FROM leads WHERE id = NEW.id))
    ) RETURNING id INTO new_task_id;

    -- Log execution
    INSERT INTO task_automation_executions (
      automation_id,
      lead_id,
      task_id,
      success,
      executed_at
    ) VALUES (
      automation.id,
      NEW.id,
      new_task_id,
      true,
      NOW()
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'execute_loan_status_changed_automations error: % %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;