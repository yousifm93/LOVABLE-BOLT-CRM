
# Plan: Fix CTC Task Automation (8th Attempt)

## 1. Diagnosis
The previous migration used incorrect column names for the `tasks` table. 
- **Error 1**: `task_status::text NOT IN ('Done')` -> Should be `status::text NOT IN ('Done')`.
- **Error 2**: `INSERT INTO tasks (... task_status ...)` -> Should be `INSERT INTO tasks (... status ...)`.

These errors caused the automation to fail every time a loan status was changed to CTC, but because of the `EXCEPTION` block, the error was swallowed and logged internally rather than stopping the status update.

## 2. Technical Steps

### Database Migration
I will update the `execute_loan_status_changed_automations` function with the following corrections:
1. Change all references of `task_status` to `status`.
2. Ensure the `trigger_config` matching logic is robust by explicitly casting to `text`.
3. Verify that the task insertion includes the `automation_id` to prevent future duplicates correctly.
4. Keep the fallback assignee logic: use the automation's assigned user first, then fall back to the lead's current assignee.

```sql
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
      AND status::text NOT IN ('Done') -- FIXED: task_status -> status
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
      status, -- FIXED: task_status -> status
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
```

## 3. Verification Strategy
Since I cannot manually interact with the UI, I will perform the following "backend test":
1. I will use the `supabase--read-query` tool to simulate the status change for **Gaurav Sharma** (Lead ID: `7da2997e-a8b1-4177-bedc-84a6157c4617`).
2. I will verify that 4 new records appear in the `tasks` table for this borrower.
3. I will verify that the `task_automation_executions` table shows 4 successful entries.
4. I will check the `postgres_logs` immediately after to ensure no silent errors occurred.

I will not report back as "Done" until I have verified the database state confirms the tasks exist.

