CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  task_count INT;
BEGIN
  -- 1. Only run when loan_status changes
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- 2. Iterate through matching task automations
  FOR automation IN
    SELECT id, name, task_name, task_priority, assigned_to_user_id, trigger_config
    FROM task_automations
    WHERE trigger_type = 'status_changed'
      AND (trigger_config->>'field')::text = 'loan_status'
      AND (trigger_config->>'target_status')::text = NEW.loan_status::text
      AND is_active = true
  LOOP
    -- 3. Check for duplicate incomplete tasks (Corrected column name: status)
    SELECT COUNT(*) INTO task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND automation_id = automation.id
      AND status::text NOT IN ('Done')
      AND deleted_at IS NULL
      AND created_at > NOW() - INTERVAL '14 days';

    IF task_count > 0 THEN
      CONTINUE;
    END IF;

    -- 4. Create the task (Corrected column name: status)
    INSERT INTO tasks (
      borrower_id,
      automation_id,
      title,
      status,
      priority,
      created_at,
      assignee_id,
      due_date
    ) VALUES (
      NEW.id,
      automation.id,
      automation.task_name,
      'To Do'::task_status,
      COALESCE(automation.task_priority, 'Medium')::task_priority,
      NOW(),
      COALESCE(automation.assigned_to_user_id, NEW.assignee_id),
      CURRENT_DATE
    ) RETURNING id INTO new_task_id;

    -- 5. Log execution
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
  -- Log the actual error to postgres logs for debugging
  RAISE LOG 'execute_loan_status_changed_automations error for lead %: % %', NEW.id, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;