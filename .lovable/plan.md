
# Plan: Fix Invalid Enum Value Error in Trigger Functions

## Summary

The error `invalid input value for enum task_status: "Archived"` is caused by the database trigger functions trying to compare the `status` column against a value that doesn't exist in the `task_status` enum.

---

## Root Cause

The `task_status` enum only has these valid values:
- `To Do`
- `In Progress`
- `Done`
- `Working on it`
- `Need help`

**There is no "Archived" value!**

The trigger functions contain this check:
```sql
IF NOT EXISTS (
  SELECT 1 FROM tasks 
  WHERE borrower_id = NEW.id 
  AND automation_id = automation_record.id
  AND status != 'Archived'   -- PostgreSQL tries to cast 'Archived' to task_status enum = ERROR
)
```

PostgreSQL attempts to compare the enum-typed `status` column against the text `'Archived'`, but since 'Archived' isn't a valid enum value, the query fails before it even runs.

---

## Solution

Change the exclusion logic from checking for 'Archived' (which doesn't exist) to checking for 'Done' (which does exist and makes sense for "don't create duplicate tasks that are already completed").

Change:
```sql
AND status != 'Archived'
```

To:
```sql
AND status::text NOT IN ('Done')
```

This casts status to text first (avoiding enum validation issues) and excludes completed tasks.

---

## Files to Modify

| File | Changes |
|------|---------|
| **New Database Migration** | Update all 4 trigger functions to use `status::text NOT IN ('Done')` |

---

## Technical Details

### Affected Functions
1. `execute_disclosure_status_changed_automations`
2. `execute_loan_status_changed_automations`
3. `execute_pipeline_stage_changed_automations`
4. `execute_lead_created_automations`

### SQL Fix Pattern

```sql
-- OLD (broken - 'Archived' is not a valid enum value)
IF NOT EXISTS (
  SELECT 1 FROM tasks 
  WHERE borrower_id = NEW.id 
  AND automation_id = automation_record.id
  AND status != 'Archived'
)

-- NEW (working - cast to text and check for completed status)
IF NOT EXISTS (
  SELECT 1 FROM tasks 
  WHERE borrower_id = NEW.id 
  AND automation_id = automation_record.id
  AND status::text NOT IN ('Done')
)
```

---

## Expected Results After Fix

1. **Loan status changes work** - Changing from SUB to AWC will succeed
2. **Disclosure status changes work** - No more enum errors
3. **Task automation triggers fire** - Tasks will be created when status changes match automation rules
4. **Duplicate prevention works correctly** - Excludes tasks marked as "Done" from duplicate checking

---

## Alternative Consideration

If you actually want an "Archived" status for tasks, we could add it to the enum instead. However, this would require:
1. Adding 'Archived' to the `task_status` enum
2. Updating any UI that shows task status options
3. Deciding where/how tasks get archived

For now, the simpler fix is to use 'Done' since it achieves the same goal (don't recreate tasks that are already completed).
