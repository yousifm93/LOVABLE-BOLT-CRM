

# Plan: Fix User Filter and Task Automations

## Summary

This plan addresses two critical issues:

1. **User Filter Not Working**: The filter for "User is Salma Mohamed" doesn't filter leads because the custom `applyAdvancedFilters` function in `Leads.tsx` doesn't handle the `teammate_assigned` column.

2. **Task Automations Not Creating Tasks**: Task automations aren't firing when leads are created or move between pipeline stages because the database trigger functions insert tasks with `status = 'pending'`, which is not a valid task_status enum value.

---

## Issue 1: User Filter Not Working

### Root Cause
The `applyAdvancedFilters` function in `src/pages/Leads.tsx` (lines 506-543) has a switch statement that only handles these columns:
- `name`, `referredVia`, `referralSource`, `converted`, `leadStrength`, `dueDate`

It does NOT handle the `user` or `teammate_assigned` column, so when a user filter is applied, the switch statement hits the `default` case which returns `true` (all leads pass).

### Solution
Update the `applyAdvancedFilters` function to handle the `teammate_assigned` filter column. Since the user wants "any assigned user" matching, we need to check both:
- `teammate_assigned` (legacy single-user field)
- `teammate_assigned_ids` (multi-user array field)

**File: `src/pages/Leads.tsx`** (lines 506-543)

Add a case for `teammate_assigned` in the switch statement:

```typescript
case 'teammate_assigned':
case 'user':
  // Check both legacy field and multi-user array
  const teammateIds = (lead as any).teammate_assigned_ids?.length 
    ? (lead as any).teammate_assigned_ids 
    : (lead.user ? [lead.user] : []);
  // For 'is' operator, check if the filter value is in the array
  if (filter.operator === 'is') {
    return teammateIds.includes(filter.value);
  } else if (filter.operator === 'is_not') {
    return !teammateIds.includes(filter.value);
  }
  return true;
```

---

## Issue 2: Task Automations Not Creating Tasks

### Root Cause
The database migration `20260202154007` updated the trigger functions to use `status = 'pending'` when inserting tasks, but `'pending'` is NOT a valid enum value for the `task_status` type. 

Valid values are:
- `'To Do'`
- `'In Progress'`
- `'Done'`
- `'Working on it'`
- `'Need help'`

This causes the INSERT to fail silently (errors are caught and logged but don't propagate).

### Affected Functions
1. `execute_lead_created_automations()` - line 48 uses `'pending'`
2. `execute_pipeline_stage_changed_automations()` - line 129 uses `'pending'`
3. `execute_disclosure_status_changed_automations()` - line 205 uses `'pending'`
4. `execute_loan_status_changed_automations()` - likely also affected

### Solution
Create a new database migration that updates all affected trigger functions to use `'To Do'` instead of `'pending'` for the task status.

**New Migration**

```sql
-- Fix task status value in all automation trigger functions
-- The status 'pending' is not a valid task_status enum value
-- Valid values: 'To Do', 'In Progress', 'Done', 'Working on it', 'Need help'

-- Fix execute_lead_created_automations
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  assignee_id_value uuid;
  v_crm_user_id uuid;
BEGIN
  -- Map auth user ID to CRM user ID for created_by
  SELECT id INTO v_crm_user_id 
  FROM users 
  WHERE auth_user_id = NEW.created_by 
  LIMIT 1;

  FOR automation IN
    SELECT * FROM public.task_automations
    WHERE is_active = true
      AND trigger_type = 'lead_created'
  LOOP
    BEGIN
      assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
      
      INSERT INTO public.tasks (
        id, title, description, status, priority,
        assignee_id, due_date, created_by, borrower_id
      )
      VALUES (
        gen_random_uuid(),
        automation.task_name,
        automation.task_description,
        'To Do',  -- FIXED: was 'pending'
        automation.task_priority,
        assignee_id_value,
        CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
        v_crm_user_id,
        NEW.id
      )
      RETURNING id INTO new_task_id;
      
      UPDATE public.task_automations 
      SET execution_count = COALESCE(execution_count, 0) + 1,
          last_run_at = now()
      WHERE id = automation.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error executing lead_created automation %: %', automation.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Fix execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
  assignee_id_value uuid;
BEGIN
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'pipeline_stage_changed'
        AND ta.trigger_config->>'target_stage_id' = NEW.pipeline_stage_id::text
    LOOP
      BEGIN
        assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);
        
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',  -- FIXED: was 'pending'
          automation.task_priority,
          assignee_id_value,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id
        )
        RETURNING id INTO new_task_id;
        
        UPDATE public.task_automations 
        SET execution_count = COALESCE(execution_count, 0) + 1,
            last_run_at = now()
        WHERE id = automation.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing pipeline_stage_changed automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix execute_disclosure_status_changed_automations  
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'disclosure_status'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      BEGIN
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',  -- FIXED: was 'pending'
          automation.task_priority,
          COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned),
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id
        )
        RETURNING id INTO new_task_id;
        
        UPDATE public.task_automations 
        SET execution_count = COALESCE(execution_count, 0) + 1,
            last_run_at = now()
        WHERE id = automation.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing disclosure_status automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix execute_loan_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
  condition_met boolean;
BEGIN
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'loan_status'
        AND LOWER(ta.trigger_config->>'target_status') = LOWER(NEW.loan_status::text)
    LOOP
      -- Check condition_field if specified
      condition_met := true;
      IF automation.trigger_config->>'condition_field' IS NOT NULL THEN
        IF automation.trigger_config->>'condition_field' = 'property_type' THEN
          condition_met := LOWER(COALESCE(NEW.property_type, '')) ILIKE '%' || LOWER(automation.trigger_config->>'condition_value') || '%';
        END IF;
      END IF;
      
      IF NOT condition_met THEN
        CONTINUE;
      END IF;
      
      BEGIN
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',  -- FIXED: was 'pending'
          automation.task_priority,
          COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned),
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id
        )
        RETURNING id INTO new_task_id;
        
        UPDATE public.task_automations 
        SET execution_count = COALESCE(execution_count, 0) + 1,
            last_run_at = now()
        WHERE id = automation.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing loan_status automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Leads.tsx` | Add `teammate_assigned`/`user` case to `applyAdvancedFilters` |
| New Migration | Fix all trigger functions to use `'To Do'` instead of `'pending'` |

---

## Technical Details

### User Filter Fix
The `teammate_assigned` filter in `filterColumns` (line 414) correctly passes user IDs and labels. The fix adds matching logic to the filter function that:
1. Collects all assigned user IDs from both `teammate_assigned` (legacy) and `teammate_assigned_ids` (array)
2. For "is" operator: checks if filter value is in the user IDs array
3. For "is_not" operator: checks if filter value is NOT in the array

### Task Status Enum Values
The `task_status` PostgreSQL enum has these values:
- `'To Do'` (default for new tasks)
- `'In Progress'`
- `'Done'`
- `'Working on it'`
- `'Need help'`

Using `'pending'` causes a silent failure because the trigger functions catch errors and log them without propagating.

---

## Testing After Implementation

1. **User Filter Test**:
   - Go to Leads page
   - Click Filter > Add filter > User > Is > Salma Mohamed
   - Verify only leads with SM user badge are shown (should be 19 leads)

2. **Lead Created Automation Test**:
   - Create a new lead
   - Verify a "Follow up on new lead" task is created and assigned to the creator

3. **Pipeline Stage Change Test**:
   - Move a lead to "Pending App" - verify "Follow up on pending app" task created
   - Move a lead to "Screening" - verify "Screen new application" task created for Herman
   - Move a lead to "Pre-Qualified" - verify 3 tasks created (call borrower, call agent, HSCI +7 days)

