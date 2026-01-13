-- Fix the trigger function: use loan_type instead of transaction_type
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  automation RECORD;
  new_task_id UUID;
  due_date_value TIMESTAMP WITH TIME ZONE;
  assignee_id_value UUID;
  is_refinance BOOLEAN;
  skip_reason TEXT;
BEGIN
  -- Only run if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  RAISE LOG '[Task Automation] loan_status changed from % to % for lead %', OLD.loan_status, NEW.loan_status, NEW.id;

  -- Check if this is a refinance loan (use loan_type column, not transaction_type)
  is_refinance := LOWER(COALESCE(NEW.loan_type, '')) = 'refinance';
  RAISE LOG '[Task Automation] is_refinance: %, loan_type: %', is_refinance, NEW.loan_type;

  -- Find all active task automations triggered by this status change
  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'status_changed'
      AND ta.trigger_config->>'field' = 'loan_status'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    BEGIN
      RAISE LOG '[Task Automation] Processing automation: % (id: %)', automation.task_name, automation.id;

      -- Skip buyer's agent and listing agent tasks for refinance loans
      IF is_refinance THEN
        -- Check by completion_requirement_type
        IF automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent') THEN
          skip_reason := 'completion_requirement_type is ' || automation.completion_requirement_type;
          RAISE LOG '[Task Automation] SKIPPED (refinance): % - %', automation.task_name, skip_reason;
          
          INSERT INTO task_automation_executions (
            automation_id, lead_id, success, error_message, executed_at
          ) VALUES (
            automation.id, NEW.id, false, 'Skipped for refinance: ' || skip_reason, NOW()
          );
          
          CONTINUE;
        END IF;
        
        -- Also check by task name as fallback
        IF LOWER(automation.task_name) LIKE '%buyer%agent%' OR LOWER(automation.task_name) LIKE '%listing%agent%' THEN
          skip_reason := 'task_name contains agent reference';
          RAISE LOG '[Task Automation] SKIPPED (refinance): % - %', automation.task_name, skip_reason;
          
          INSERT INTO task_automation_executions (
            automation_id, lead_id, success, error_message, executed_at
          ) VALUES (
            automation.id, NEW.id, false, 'Skipped for refinance: ' || skip_reason, NOW()
          );
          
          CONTINUE;
        END IF;
      END IF;

      -- Check for duplicate task
      IF EXISTS (
        SELECT 1 FROM tasks
        WHERE borrower_id = NEW.id
          AND title = automation.task_name
          AND status != 'done'
          AND deleted_at IS NULL
      ) THEN
        RAISE LOG '[Task Automation] SKIPPED (duplicate): % already exists for lead %', automation.task_name, NEW.id;
        
        INSERT INTO task_automation_executions (
          automation_id, lead_id, success, error_message, executed_at
        ) VALUES (
          automation.id, NEW.id, false, 'Skipped: duplicate task already exists', NOW()
        );
        
        CONTINUE;
      END IF;

      -- Calculate due date
      IF automation.due_date_offset IS NOT NULL THEN
        due_date_value := NOW() + (automation.due_date_offset || ' days')::INTERVAL;
      ELSE
        due_date_value := NULL;
      END IF;

      -- Get assignee: use automation's assigned_to_user_id, fallback to lead's teammate_assigned
      assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);

      RAISE LOG '[Task Automation] Creating task: %, assignee: %, due: %', automation.task_name, assignee_id_value, due_date_value;

      -- Create the task
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation.task_name,
        automation.task_description,
        NEW.id,
        assignee_id_value,
        COALESCE(automation.priority, 'medium')::task_priority,
        due_date_value,
        'todo'::task_status,
        NEW.teammate_assigned,
        automation.completion_requirement_type
      )
      RETURNING id INTO new_task_id;

      RAISE LOG '[Task Automation] SUCCESS: Created task % for lead %', new_task_id, NEW.id;

      -- Log successful execution
      INSERT INTO task_automation_executions (
        automation_id, lead_id, task_id, success, executed_at
      ) VALUES (
        automation.id, NEW.id, new_task_id, true, NOW()
      );

    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[Task Automation] ERROR for automation %: %', automation.id, SQLERRM;
      
      INSERT INTO task_automation_executions (
        automation_id, lead_id, success, error_message, executed_at
      ) VALUES (
        automation.id, NEW.id, false, SQLERRM, NOW()
      );
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;