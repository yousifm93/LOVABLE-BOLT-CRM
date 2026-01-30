
# Plan: Fix Appraisal Status Update & @ Mentions in Log Call Modal

## Summary of Issues

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | Appraisal status "Received" update fails | Database trigger inserts into non-existent `task_created` column | Fix trigger to use correct columns (`task_id`, `success`) |
| 2 | @ mentions not working in Log Call modal | Popover z-index blocked by modal, and position clipped | Fix popover z-index and positioning |
| 3 | Appraisal upload doesn't auto-set status to "Received" | Auto-flip logic exists in AppraisalTab but may not execute | Ensure all upload paths trigger the status flip |

---

## Issue 1: Database Trigger Column Error

### Problem
The error message shows: `column "task_created" of relation "task_automation_executions" does not exist`

The previous migration still uses `task_created` column which doesn't exist. The actual columns are:
- `task_id` (uuid) - the ID of the created task
- `success` (boolean) - whether the automation succeeded

### Current Broken Code (lines 53-63 in migration)
```sql
INSERT INTO task_automation_executions (
  automation_id,
  lead_id,
  task_created,  -- WRONG: Column doesn't exist!
  executed_at
) VALUES (...)
```

### Fix
Create a new migration to fix all three trigger functions to use the correct columns:

```sql
INSERT INTO task_automation_executions (
  automation_id,
  lead_id,
  task_id,      -- CORRECT: Reference to created task
  executed_at,
  success       -- CORRECT: Boolean success indicator
) VALUES (
  automation.id,
  NEW.id,
  new_task_id,  -- Need to capture task ID from the INSERT
  NOW(),
  true
);
```

The trigger functions need to:
1. Capture the new task ID using `RETURNING id INTO new_task_id`
2. Insert into correct columns (`task_id`, `success`)

---

## Issue 2: @ Mentions Not Working in Log Call Modal

### Root Cause
The mention dropdown popover has `z-50` but the dialog modal uses higher z-index. Additionally, the popover is positioned `bottom-full` which may be clipped by the modal's overflow settings.

### Fix
1. Increase z-index of mention popover to `z-[9999]` to appear above modal
2. Change positioning from `bottom-full` to fixed positioning or use a portal

### Code Change in `mentionable-rich-text-editor.tsx`
```typescript
// Current
<div className="absolute bottom-full left-0 mb-1 z-50 w-64 ...">

// Fixed
<div className="absolute bottom-full left-0 mb-1 z-[9999] w-64 ...">
```

If z-index alone doesn't fix it (due to modal clipping), we may need to position the dropdown below the cursor instead of above:
```typescript
<div className="absolute top-full left-0 mt-1 z-[9999] w-64 ...">
```

---

## Issue 3: Appraisal Status Auto-Flip

### Current State
The `AppraisalTab.tsx` correctly sets status to "Received" on upload (lines 112-114):
```typescript
await onUpdate('appraisal_status', 'Received');
await onUpdate('appraisal_received_on', new Date().toISOString().split('T')[0]);
```

However, this only runs if the AI parsing succeeds. If parsing fails, the status isn't updated.

### Fix
Ensure status is set to "Received" regardless of parsing success/failure:

```typescript
// Move status update outside the try block OR add in finally
onUpdate('appraisal_file', storagePath);
onUpdate('appraisal_status', 'Received');
onUpdate('appraisal_received_on', new Date().toISOString().split('T')[0]);

// Then try to parse and auto-fill the value
try {
  // AI parsing...
} catch {
  // Show manual entry toast
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| New SQL migration | Fix 3 trigger functions to use correct columns |
| `src/components/ui/mentionable-rich-text-editor.tsx` | Fix popover z-index for modal context |
| `src/components/lead-details/AppraisalTab.tsx` | Ensure status updates before/regardless of parsing |

---

## Database Migration SQL

```sql
-- Fix trigger functions with correct task_automation_executions columns

-- 1. Fix execute_appraisal_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
  v_new_task_id uuid;
BEGIN
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'appraisal_status'
        AND ta.trigger_config->>'target_status' = NEW.appraisal_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'To Do',
        v_user_id,
        automation.id
      )
      RETURNING id INTO v_new_task_id;

      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        executed_at,
        success
      ) VALUES (
        automation.id,
        NEW.id,
        v_new_task_id,
        NOW(),
        true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Fix execute_package_status_changed_automations  
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
  v_new_task_id uuid;
BEGIN
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'package_status_change'
        AND ta.trigger_config->>'target_status' = NEW.package_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'To Do',
        v_user_id,
        automation.id
      )
      RETURNING id INTO v_new_task_id;

      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        executed_at,
        success
      ) VALUES (
        automation.id,
        NEW.id,
        v_new_task_id,
        NOW(),
        true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
  v_new_task_id uuid;
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'disclosure_status_change'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'To Do',
        v_user_id,
        automation.id
      )
      RETURNING id INTO v_new_task_id;

      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        executed_at,
        success
      ) VALUES (
        automation.id,
        NEW.id,
        v_new_task_id,
        NOW(),
        true
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## Expected Results After Fix

1. **Appraisal Status**: Changing to "Received" will work - no more database column errors
2. **@ Mentions**: Team member dropdown will appear above the modal when typing `@` in Log Call modal
3. **Auto-Status Update**: Uploading appraisal will reliably set status to "Received"
