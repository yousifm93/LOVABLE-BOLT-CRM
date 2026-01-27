

## Fix Plan: Four Issues with Lead Management & Task Automation

### Overview

This plan addresses four distinct issues:
1. **Likely to Apply popup too small** - Modal needs to be larger so fields are fully visible
2. **Follow-up on new lead task has no due date** - Automation needs `due_date_offset_days` set to 0
3. **New lead task not assigned to creator** - The task should be assigned to whoever created the lead, not a hardcoded user
4. **Active stage tasks missing** - Need to create four task automations when a file moves to Active (via loan_status = 'New')

---

### Issue 1: Likely to Apply Popup Size

**Problem**: The pipeline validation modal (triggered when moving to Pending App) is too small - the "Likely to Apply" field isn't fully visible.

**Root Cause**: The modal uses `max-w-md` (28rem / 448px) which is too narrow for the form fields.

**Solution**: Increase the modal width to `max-w-lg` (32rem / 512px) or `max-w-xl` for better visibility.

**File to Modify**: `src/components/ClientDetailDrawer.tsx`

**Change** (Line ~3177):
```typescript
// Before:
<DialogContent className="max-w-md">

// After:
<DialogContent className="max-w-lg">
```

---

### Issue 2: Follow-up Task Missing Due Date

**Problem**: When a new lead is created, the "Follow up on new lead" task is created without a due date.

**Root Cause**: The `task_automations` record for "Follow up on new lead" (id: `30c8ebeb-b9e0-4347-b541-0e2eb755ac2a`) has `due_date_offset_days = NULL`.

**Current State**:
- `assigned_to_user_id`: Yousif Mohamed (08e73d69...)
- `due_date_offset_days`: NULL

**Solution**: Update the automation to set `due_date_offset_days = 0` (due today).

**Database Change** (via migration):
```sql
UPDATE task_automations 
SET due_date_offset_days = 0 
WHERE id = '30c8ebeb-b9e0-4347-b541-0e2eb755ac2a';
```

---

### Issue 3: Task Assigned to Lead Creator

**Problem**: The "Follow up on new lead" task should be assigned to whoever created the lead, not a hardcoded user.

**Root Cause**: The automation has `assigned_to_user_id` set to Yousif Mohamed, and the trigger function falls back to this value even though the lead's `teammate_assigned` is available.

**Current Logic** in `execute_lead_created_automations`:
```sql
assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);
```
This means the automation's hardcoded user takes precedence.

**Solution**: 
1. Set the automation's `assigned_to_user_id` to NULL
2. Update the trigger function to use `NEW.teammate_assigned` (the lead creator) as the primary assignee

**Changes**:

**A. Database Update** (via migration):
```sql
-- Remove hardcoded assignee so task goes to lead creator
UPDATE task_automations 
SET assigned_to_user_id = NULL
WHERE id = '30c8ebeb-b9e0-4347-b541-0e2eb755ac2a';
```

**B. Update Trigger Function** to prefer lead's `teammate_assigned`:
```sql
-- Prefer lead's teammate_assigned (who created it), fall back to automation's assigned_to
assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
```

This ensures the lead creator gets the follow-up task.

---

### Issue 4: Four Tasks When Moving to Active

**Problem**: When a contract is uploaded or file moves to Active, four tasks should be created:
1. To disclose
2. On board  
3. To have a borrower call
4. To have a buyer's agent call

**Current State**: 
- There's already a "Disclose" automation (`71f663f2...`) for `loan_status = 'New'`
- There's already an "On-Board New Client" automation (`a8d7ca55...`) for `loan_status = 'New'`
- The borrower call and buyer's agent call tasks are **missing** for the Active/New status

**Solution**: Create two new task automations for when `loan_status` changes to 'New':

| Task Name | Assigned To | Trigger |
|-----------|-------------|---------|
| Call Borrower - New Active File | Herman Daza | loan_status = 'New' |
| Call Buyer's Agent - New Active File | Herman Daza | loan_status = 'New' |

**Database Change** (via migration):
```sql
-- Create "Call Borrower - New Active File" automation
INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active,
  category, completion_requirement_type
) VALUES (
  'Call Borrower - New Active File',
  'status_changed',
  '{"field": "loan_status", "target_status": "New"}',
  'Call Borrower - New Active File',
  'Call the borrower to welcome them to active status and discuss next steps',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', -- Herman Daza
  'High',
  0,
  true,
  'active_loan',
  'log_call_borrower'
);

-- Create "Call Buyer's Agent - New Active File" automation
INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active,
  category, completion_requirement_type
) VALUES (
  'Call Buyers Agent - New Active File',
  'status_changed',
  '{"field": "loan_status", "target_status": "New"}',
  'Call Buyers Agent - New Active File',
  'Call the buyers agent to introduce yourself and coordinate on the active file',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', -- Herman Daza
  'High',
  0,
  true,
  'active_loan',
  'log_call_buyer_agent'
);
```

---

### Summary of All Changes

| Issue | File | Change Type |
|-------|------|-------------|
| 1. Popup size | `src/components/ClientDetailDrawer.tsx` | Change `max-w-md` to `max-w-lg` |
| 2. Due date | Database migration | Set `due_date_offset_days = 0` |
| 3. Assignee | Database migration + trigger function | Set automation's assignee to NULL, update trigger logic |
| 4. Active tasks | Database migration | Insert 2 new task automations |

---

### Technical Details

**Modified Trigger Function Logic**:

The `execute_lead_created_automations` function will be updated so that:
- If the automation has no `assigned_to_user_id`, use the lead's `teammate_assigned` (the creator)
- If neither is set, the task will have no assignee (NULL)

```sql
-- New priority order: lead creator first, then automation default
assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
```

**Existing "On-Board" and "Disclose" Automations**:
These already exist and will fire when `loan_status = 'New'`, so no changes needed there:
- `Disclose` → Herman Daza
- `On-Board New Client` → Herman Daza

With the two new call tasks, moving to Active will create all four required tasks.

