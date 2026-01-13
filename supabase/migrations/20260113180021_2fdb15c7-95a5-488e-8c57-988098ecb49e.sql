-- Fix column names for task_automations table in loan status automation function
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
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  RAISE LOG '[Task Automation] loan_status changed from % to % for lead %', OLD.loan_status, NEW.loan_status, NEW.id;

  is_refinance := LOWER(COALESCE(NEW.loan_type, '')) = 'refinance';
  RAISE LOG '[Task Automation] is_refinance: %, loan_type: %', is_refinance, NEW.loan_type;

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

      IF is_refinance THEN
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

      -- Duplicate prevention: treat only status = 'Done' as completed
      IF EXISTS (
        SELECT 1 FROM tasks
        WHERE borrower_id = NEW.id
          AND title = automation.task_name
          AND deleted_at IS NULL
          AND status::text <> 'Done'
      ) THEN
        RAISE LOG '[Task Automation] SKIPPED (duplicate): % already exists for lead %', automation.task_name, NEW.id;

        INSERT INTO task_automation_executions (
          automation_id, lead_id, success, error_message, executed_at
        ) VALUES (
          automation.id, NEW.id, false, 'Skipped: duplicate task already exists', NOW()
        );

        CONTINUE;
      END IF;

      -- Calculate due date (task_automations uses due_date_offset_days)
      IF automation.due_date_offset_days IS NOT NULL THEN
        due_date_value := NOW() + (automation.due_date_offset_days || ' days')::INTERVAL;
      ELSE
        due_date_value := NULL;
      END IF;

      -- Assignee: prefer automation-assignee, fallback to lead teammate
      assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);

      RAISE LOG '[Task Automation] Creating task: %, assignee: %, due: %', automation.task_name, assignee_id_value, due_date_value;

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
        COALESCE(automation.task_priority, 'Medium')::task_priority,
        due_date_value,
        'To Do'::task_status,
        NEW.teammate_assigned,
        automation.completion_requirement_type
      )
      RETURNING id INTO new_task_id;

      RAISE LOG '[Task Automation] SUCCESS: Created task % for lead %', new_task_id, NEW.id;

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