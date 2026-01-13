-- Fix execute_loan_status_changed_automations() trigger function
-- The issue: the function references automation.task_title but the actual column is task_name

CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  priority_value task_priority := 'Medium';
  due_date_value date;
  delay_days int;
  assignee_id_value uuid;
  existing_task_count int;
  loan_type_value text;
BEGIN
  -- Check if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  loan_type_value := NEW.loan_type;

  RAISE LOG 'execute_loan_status_changed_automations: Lead % loan_status changed from % to %, loan_type: %', 
    NEW.id, OLD.loan_status, NEW.loan_status, loan_type_value;

  -- Skip automations for refinance loans
  IF loan_type_value IS NOT NULL AND loan_type_value ILIKE '%refinance%' THEN
    RAISE LOG 'execute_loan_status_changed_automations: Skipping - refinance loan type';
    RETURN NEW;
  END IF;

  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'loan_status_change'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    RAISE LOG 'execute_loan_status_changed_automations: Processing automation % for lead %', automation.name, NEW.id;

    -- Check for duplicate tasks - use task_name (correct column name)
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND title = automation.task_name
      AND deleted_at IS NULL;

    IF existing_task_count > 0 THEN
      RAISE LOG 'execute_loan_status_changed_automations: Skipping - duplicate task exists for automation %', automation.name;
      CONTINUE;
    END IF;

    -- Calculate due date
    delay_days := COALESCE((automation.trigger_config->>'delay_days')::int, 0);
    due_date_value := CURRENT_DATE + delay_days;

    -- Get priority from automation config
    IF automation.trigger_config->>'priority' IS NOT NULL THEN
      priority_value := (automation.trigger_config->>'priority')::task_priority;
    ELSE
      priority_value := 'Medium';
    END IF;

    -- Get assignee
    assignee_id_value := automation.assigned_to_user_id;

    -- Insert the new task with explicit status value and correct column references
    INSERT INTO tasks (
      borrower_id,
      title,
      description,
      status,
      priority,
      due_date,
      assigned_to,
      created_by_automation_id
    ) VALUES (
      NEW.id,
      automation.task_name,
      automation.task_description,
      'To Do',
      priority_value,
      due_date_value,
      assignee_id_value,
      automation.id
    )
    RETURNING id INTO new_task_id;

    RAISE LOG 'execute_loan_status_changed_automations: Created task % for lead %', new_task_id, NEW.id;

    -- Log the execution
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

    RAISE LOG 'execute_loan_status_changed_automations: Logged execution for automation %', automation.id;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'execute_loan_status_changed_automations: Error % - %', SQLSTATE, SQLERRM;
  -- Don't fail the lead update, just log the error
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;