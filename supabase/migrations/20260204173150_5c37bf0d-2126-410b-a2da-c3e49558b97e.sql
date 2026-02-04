-- Hardened loan_status automation trigger with:
-- 1. Case-insensitive matching for target_status
-- 2. Omits status/priority columns to use DB defaults (prevents null constraint violations)
-- 3. Per-automation error logging with error_message
-- 4. Continues processing remaining automations even if one fails

CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  task_count INT;
  v_error_msg TEXT;
BEGIN
  -- Only run when loan_status actually changes
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- Iterate through matching task automations (case-insensitive match)
  FOR automation IN
    SELECT ta.id, ta.name, ta.task_name, ta.task_priority, ta.assigned_to_user_id, ta.trigger_config
    FROM task_automations ta
    WHERE ta.trigger_type = 'status_changed'
      AND (ta.trigger_config->>'field')::text = 'loan_status'
      AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.loan_status::text)
      AND ta.is_active = true
  LOOP
    BEGIN
      -- Check for duplicate incomplete tasks within 14 days
      SELECT COUNT(*) INTO task_count
      FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND t.automation_id = automation.id
        AND t.status::text NOT IN ('Done')
        AND t.deleted_at IS NULL
        AND t.created_at > NOW() - INTERVAL '14 days';

      IF task_count > 0 THEN
        -- Log skipped due to duplicate
        INSERT INTO task_automation_executions (
          automation_id, lead_id, success, executed_at, error_message
        ) VALUES (
          automation.id, NEW.id, true, NOW(), 'Skipped: duplicate task exists within 14 days'
        );
        CONTINUE;
      END IF;

      -- Create the task - omit status and priority to use DB defaults
      INSERT INTO tasks (
        borrower_id,
        automation_id,
        title,
        created_at,
        assignee_id,
        due_date
      ) VALUES (
        NEW.id,
        automation.id,
        automation.task_name,
        NOW(),
        COALESCE(automation.assigned_to_user_id, NEW.assignee_id),
        CURRENT_DATE
      ) RETURNING id INTO new_task_id;

      -- Log successful execution
      INSERT INTO task_automation_executions (
        automation_id, lead_id, task_id, success, executed_at
      ) VALUES (
        automation.id, NEW.id, new_task_id, true, NOW()
      );

    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue with other automations
      v_error_msg := SQLSTATE || ': ' || SQLERRM;
      
      INSERT INTO task_automation_executions (
        automation_id, lead_id, success, executed_at, error_message
      ) VALUES (
        automation.id, NEW.id, false, NOW(), v_error_msg
      );
      
      RAISE LOG 'Task automation % failed for lead %: %', automation.id, NEW.id, v_error_msg;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;