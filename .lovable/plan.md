
# Plan: Fix Task Automation Trigger Function Column Mismatches

## Summary

The task automations for AWC exist and are correctly configured, but the trigger function is using **wrong column names** that don't match the actual database schema. This causes the trigger to find zero matching automations.

---

## Root Cause

The `execute_loan_status_changed_automations` trigger function references column names that don't exist:

| Trigger Function Uses | Actual Column Name | Location |
|-----------------------|-------------------|----------|
| `trigger_config->>'trigger_field'` | `trigger_config->>'field'` | JSON key |
| `trigger_config->>'trigger_value'` | `trigger_config->>'target_status'` | JSON key |
| `automation_record.default_assignee_id` | `automation_record.assigned_to_user_id` | Column |
| `automation_record.task_title` | `automation_record.task_name` | Column |

**Evidence from database:**
```json
// Actual trigger_config in database:
{"field": "loan_status", "target_status": "AWC"}

// But trigger function looks for:
{"trigger_field": "...", "trigger_value": "..."}
```

This mismatch means the query `WHERE (ta.trigger_config->>'trigger_field')::text = 'loan_status'` returns **zero rows** because the JSON key is actually `field`, not `trigger_field`.

---

## Solution

Create a database migration to fix all 4 trigger functions with the correct column names:
- `execute_loan_status_changed_automations`
- `execute_disclosure_status_changed_automations`
- `execute_pipeline_stage_changed_automations`
- `execute_lead_created_automations`

---

## Files to Modify

| File | Changes |
|------|---------|
| **New Database Migration** | Update all 4 trigger functions with correct column names |

---

## Technical Details

### SQL Fix Pattern

```sql
-- Current (WRONG - column names don't match schema)
FOR automation_record IN
  SELECT ta.* 
  FROM task_automations ta
  WHERE ta.is_active = true
    AND ta.trigger_type = 'status_changed'
    AND (ta.trigger_config->>'trigger_field')::text = 'loan_status'
    AND (ta.trigger_config->>'trigger_value')::text = NEW.loan_status::text
LOOP
  -- Uses: automation_record.default_assignee_id (doesn't exist)
  -- Uses: automation_record.task_title (doesn't exist)

-- Fixed (CORRECT - matches actual schema)
FOR automation_record IN
  SELECT ta.* 
  FROM task_automations ta
  WHERE ta.is_active = true
    AND ta.trigger_type = 'status_changed'
    AND (ta.trigger_config->>'field')::text = 'loan_status'
    AND (ta.trigger_config->>'target_status')::text = NEW.loan_status::text
LOOP
  -- Uses: automation_record.assigned_to_user_id (correct!)
  -- Uses: automation_record.task_name (correct!)
```

### All Column Name Fixes Required

1. **JSON config keys:**
   - `trigger_field` → `field`
   - `trigger_value` → `target_status`

2. **Table columns:**
   - `default_assignee_id` → `assigned_to_user_id`
   - `task_title` → `task_name`
   - `task_description` stays the same (correct)

---

## Expected Results After Fix

1. **AWC status change creates 3 tasks:**
   - Intro call (Borrower intro call)
   - Upload initial approval (Loan AWC - Upload Initial Approval)
   - Add Approval Conditions

2. **All other status automations work:**
   - RFP creates Order Title Work, Submit File, Condo Approval
   - CTC creates call tasks
   - New status creates Disclose, On-board, Call tasks

3. **Execution logging works:**
   - Each created task is logged in `task_automation_executions`

---

## Testing Steps

1. After applying migration, change a loan status from SUB → AWC
2. Verify 3 tasks are created in the Tasks page
3. Check task_automation_executions table for logged entries
