-- Fix execute_loan_status_changed_automations trigger - remove trigger_data column insert
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  task_count INT;
BEGIN
  -- Iterate through matching task automations
  FOR automation IN
    SELECT id, name, task_automations.task_name, task_priority, trigger_config
    FROM task_automations
    WHERE pipeline_group = (
      SELECT pipeline_group FROM leads WHERE id = NEW.id
    )
    AND trigger_type = 'loan_status_changed'
    AND (trigger_config->>'target_status')::text = NEW.loan_status::text
  LOOP
    -- Check for duplicate incomplete tasks
    SELECT COUNT(*) INTO task_count
    FROM tasks
    WHERE lead_id = NEW.id
    AND borrower_id IS NULL
    AND automation_id = automation.id
    AND task_status::text NOT IN ('Done')
    AND created_at > NOW() - INTERVAL '14 days';

    IF task_count > 0 THEN
      CONTINUE;
    END IF;

    -- Create the task
    INSERT INTO tasks (
      lead_id,
      automation_id,
      task_name,
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
      (SELECT assignee_id FROM leads WHERE id = NEW.id LIMIT 1)
    ) RETURNING id INTO new_task_id;

    -- Log execution (without non-existent trigger_data column)
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