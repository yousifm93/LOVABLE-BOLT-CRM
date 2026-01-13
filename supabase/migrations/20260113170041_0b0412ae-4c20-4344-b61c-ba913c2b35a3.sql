-- Fix refinance loan task automation logic
-- Previously: ALL automations were skipped for refinance loans
-- Now: Only skip tasks related to buyer's agent or listing agent for refinance loans

CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  loan_type_value TEXT;
  assignee_id_value UUID;
  due_date_value DATE;
  priority_value TEXT;
  existing_task_count INTEGER;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- Get loan type for conditional logic
  loan_type_value := NEW.loan_type;

  RAISE LOG 'Loan status changed from % to % for lead %', OLD.loan_status, NEW.loan_status, NEW.id;

  -- Find all active loan_status_change automations matching the new status
  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'loan_status_change'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    RAISE LOG 'Processing automation: % for loan status %', automation.name, NEW.loan_status;

    -- Skip buyer's agent and listing agent tasks ONLY for refinance loans
    IF loan_type_value ILIKE '%refinance%' THEN
      IF automation.task_name ILIKE '%buyer''s agent%' 
         OR automation.task_name ILIKE '%listing agent%' THEN
        RAISE LOG 'Skipping agent-related task for refinance loan: %', automation.task_name;
        CONTINUE;  -- Skip to next automation, don't exit entirely
      END IF;
    END IF;

    -- Check for existing task to avoid duplicates
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND title = automation.task_name
      AND deleted_at IS NULL;

    IF existing_task_count > 0 THEN
      RAISE LOG 'Task already exists for lead %, skipping: %', NEW.id, automation.task_name;
      CONTINUE;
    END IF;

    -- Calculate due date
    IF automation.due_date_offset_days IS NOT NULL THEN
      due_date_value := CURRENT_DATE + automation.due_date_offset_days;
    ELSE
      due_date_value := CURRENT_DATE;
    END IF;

    -- Get priority
    priority_value := COALESCE(automation.task_priority, 'Medium');

    -- Get assignee from automation config or lead's assigned_to
    IF automation.assigned_to IS NOT NULL THEN
      assignee_id_value := automation.assigned_to;
    ELSE
      assignee_id_value := NEW.assigned_to;
    END IF;

    -- Insert the task
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
    );

    RAISE LOG 'Created task: % for lead %', automation.task_name, NEW.id;

  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in execute_loan_status_changed_automations: % - %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;