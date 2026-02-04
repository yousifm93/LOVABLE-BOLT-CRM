
# Plan: Fix CTC Task Automation + Deploy Edge Function

## Summary
The CTC status change is working (no error), but tasks aren't being created because the database trigger function has incorrect logic. Additionally, the edge function for email tracking has been successfully deployed with your Pro plan upgrade.

---

## Root Cause Analysis

### Why CTC Tasks Aren't Created

The trigger function `execute_loan_status_changed_automations` has **two critical bugs**:

| Issue | Current Code | What It Should Be |
|-------|--------------|-------------------|
| Wrong trigger_type | `trigger_type = 'loan_status_changed'` | `trigger_type = 'status_changed' AND trigger_config->>'field' = 'loan_status'` |
| Non-existent column | `WHERE pipeline_group = ...` | Remove this filter (column doesn't exist) |

The CTC automations exist and are active:
- "File is CTC - Call Borrower"
- "File is CTC - Call Buyer's Agent"  
- "File is CTC - Call Listing Agent"
- "Finalize Closing Package"

But they all have `trigger_type = 'status_changed'` with `trigger_config = {field: 'loan_status', target_status: 'CTC'}`, so the trigger never finds them.

---

## Implementation

### Database Migration

Update the trigger function to fix the WHERE clause:

```sql
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
```

---

## Edge Function Status

| Function | Status | Purpose |
|----------|--------|---------|
| `sync-lender-email-replies` | ✅ **Deployed** | Scans email_logs for lender replies and updates tracking fields |

The Pro plan upgrade was successful! The edge function is now live and ready to use.

---

## Expected Results After Fix

1. **CTC Status Change**: Will create all 4 CTC-related tasks:
   - File is CTC - Call Borrower
   - File is CTC - Call Buyer's Agent
   - File is CTC - Call Listing Agent
   - Finalize Closing Package

2. **Email Reply Tracking**: You can now call the `sync-lender-email-replies` function to update lender reply status

---

## Files to Modify

| Component | Change |
|-----------|--------|
| New Database Migration | Fix `execute_loan_status_changed_automations()` trigger function |

---

## Testing Steps

After approving this plan:
1. Change a lead's loan_status to CTC
2. Verify all 4 tasks are created in the Tasks page
3. Call the `sync-lender-email-replies` edge function to sync lender email replies
