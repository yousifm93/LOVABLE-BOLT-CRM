
# Plan: Fix Multiple Issues in Mortgage CRM - Round 2

## Summary

This plan addresses the following issues identified from the user's feedback:

1. **Pre-Qualified HSCI Task** - Add 3rd task "Home Search Check In (HSCI)" due 7 days after moving to Pre-Qualified
2. **Screening Task Not Working for All Users** - Fix FK constraint error in `execute_pipeline_stage_changed_automations`
3. **Disclosure Status Automations Not Working** - Fix `execute_disclosure_status_changed_automations` to use correct trigger_type
4. **New RFP Automations** - Add "Condo Approval" (conditional on property_type=Condo) and "Order Title Work" tasks
5. **Lead Creation Task Failing for Some Users** - Fix FK constraint error in `execute_lead_created_automations`
6. **User Filter Shows UUIDs** - Update `ButtonFilterBuilder` to support `optionLabels`
7. **Duplicate Fields in DetailsTab** - Remove fields that are now in Live Deal section
8. **Agent Search Not Working** - Debug and fix sidebar search for agents

---

## Issue 1: Pre-Qualified HSCI Task Automation

### Problem
When a lead moves to Pre-Qualified, only 2 tasks are created. Need a 3rd task "Home Search Check In (HSCI)" due 7 days from the move date.

### Solution
**Database Migration**: Insert a new task_automation record

```sql
INSERT INTO task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  due_date_offset_days,
  is_active
) VALUES (
  'Home Search Check In (HSCI)',
  'pipeline_stage_changed',
  '{"target_stage_id": "09162eec-d2b2-48e5-86d0-9e66ee8b2af7"}'::jsonb,
  'Home Search Check In (HSCI)',
  'Follow up with borrower on their home search progress',
  'High',
  NULL, -- Will use lead's teammate_assigned
  7,
  true
);
```

**Also update the trigger function** to use the lead's `teammate_assigned` when `assigned_to_user_id` is NULL:

```sql
-- In execute_pipeline_stage_changed_automations:
COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned)
```

---

## Issue 2: Screening Task Not Working for All Users

### Root Cause
The `execute_pipeline_stage_changed_automations` function uses `v_user_id` (from JWT claims) as `created_by`, but this is an auth.users UUID which violates the foreign key constraint on `tasks.created_by` (which references `users.id`).

### Solution
**Database Migration**: Update the function to lookup the CRM user ID:

```sql
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
BEGIN
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    -- Get the current user ID from JWT claims
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      -- Map auth user ID to CRM user ID
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    -- ... rest of function uses v_crm_user_id as created_by
```

---

## Issue 3: Disclosure Status Automations Not Working

### Root Cause
The `execute_disclosure_status_changed_automations` function (line 92) looks for:
```sql
trigger_type = 'disclosure_status_change'
```

But all disclosure automations are stored with:
```sql
trigger_type = 'status_changed'
trigger_config->>'field' = 'disclosure_status'
```

### Solution
**Database Migration**: Update the function to match the correct trigger_type:

```sql
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- ... (header unchanged)
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    -- ...
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'  -- FIXED: was 'disclosure_status_change'
        AND ta.trigger_config->>'field' = 'disclosure_status'  -- ADDED: field check
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
    -- ... rest unchanged
```

---

## Issue 4: New RFP (Ready for Processor) Automations

### Problem
When loan_status changes to "RFP", need to create:
1. **Condo Approval** task - assigned to Ashley, due today, notes "Order condo docs" - ONLY if property_type is "Condo" or "Condominium"
2. **Order Title Work** task - assigned to Ashley, due today

### Solution
**Database Migration**: Insert two new task_automations

```sql
-- Order Title Work (always)
INSERT INTO task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  due_date_offset_days,
  is_active
) VALUES (
  'Order Title Work',
  'status_changed',
  '{"field": "loan_status", "target_status": "RFP"}'::jsonb,
  'Order Title Work',
  'Order title work for this loan',
  'High',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a', -- Ashley
  0,
  true
);

-- Condo Approval (conditional - needs special handling)
INSERT INTO task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  due_date_offset_days,
  is_active
) VALUES (
  'Condo Approval',
  'status_changed',
  '{"field": "loan_status", "target_status": "RFP", "condition_field": "property_type", "condition_value": "Condo"}'::jsonb,
  'Condo Approval',
  'Order condo docs',
  'High',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a', -- Ashley
  0,
  true
);
```

**Also update `execute_loan_status_changed_automations`** to support the condition check:

```sql
-- Add condition checking in the loop:
FOR automation IN
  SELECT ta.*
  FROM task_automations ta
  WHERE ta.is_active = true
    AND ta.trigger_type = 'status_changed'
    AND ta.trigger_config->>'field' = 'loan_status'
    AND LOWER(ta.trigger_config->>'target_status') = LOWER(NEW.loan_status::text)
    -- Add condition check
    AND (
      ta.trigger_config->>'condition_field' IS NULL
      OR (
        ta.trigger_config->>'condition_field' = 'property_type'
        AND LOWER(NEW.property_type) ILIKE '%' || LOWER(ta.trigger_config->>'condition_value') || '%'
      )
    )
LOOP
```

---

## Issue 5: Lead Creation Task Failing for Some Users

### Root Cause
Same FK constraint issue. The `execute_lead_created_automations` function uses `NEW.created_by` (auth.users UUID) as `tasks.created_by`, but the FK requires a `users.id`.

### Solution
**Database Migration**: Update the function to lookup the CRM user ID:

```sql
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
        -- ...
        created_by,  -- Use CRM user ID, not auth user ID
        -- ...
      )
      VALUES (
        -- ...
        v_crm_user_id,  -- FIXED: was NEW.created_by
        -- ...
      )
      -- ...
```

---

## Issue 6: User Filter Shows UUIDs Instead of Names

### Root Cause
The `ButtonFilterBuilder` component's `FilterColumn` interface doesn't include `optionLabels`, so even though `Leads.tsx` passes it, it's not used.

### Solution
**File: `src/components/ui/button-filter-builder.tsx`**

1. Update the `FilterColumn` interface (line 19-24):
```typescript
export interface FilterColumn {
  label: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  optionLabels?: Record<string, string>; // ADD THIS
}
```

2. Update the select options rendering (around line 341-353) to use labels:
```typescript
{selectedColumn.options.map(option => (
  <Button
    key={option}
    variant="outline"
    size="sm"
    onClick={() => handleAddFilterWithValue(option)}
    className="justify-start h-8 text-xs"
  >
    {selectedColumn.optionLabels?.[option] || option}
  </Button>
))}
```

3. Update the filter chip display (around line 181) to show labels:
```typescript
{filter.value && (
  <span className="text-foreground">
    "{column?.optionLabels?.[String(filter.value)] || String(filter.value)}"
  </span>
)}
```

---

## Issue 7: Duplicate Fields in DetailsTab

### Problem
Several fields now appear twice - once in the new "Live Deal" section and once in their original locations.

### Solution
**File: `src/components/lead-details/DetailsTab.tsx`**

Remove these fields from their original sections:

1. **From Transaction Details (lines 963-987)**: Remove `Subject Property Rental Income` and `Closing Date`
2. **From Rate Lock Information (lines 1553-1587)**: Remove `Prepayment Penalty`, `Lock Expiration`, and `Credits`

The Live Deal section already has these fields, so they just need to be removed from the duplicated locations.

Also rename "Lender Credits" to just "Credits" in the Live Deal section (line 1416).

---

## Issue 8: Agent Search Not Working in Sidebar

### Root Cause
The agent search query looks correct, but checking the database shows agents exist. The issue may be with how results are being rendered or the `deleted_at` filter.

### Analysis
Database query shows "David Fraine" and other David agents exist with `deleted_at = NULL`. The search query in `AppSidebar.tsx` (lines 201-215) correctly:
- Searches `buyer_agents` table
- Uses `.is('deleted_at', null)`
- Limits to 5 results

### Solution
**File: `src/components/AppSidebar.tsx`**

Add console logging to debug:
```typescript
console.log('Agent search for:', term, 'Results:', agents);
```

The more likely issue is the render - the agent type icon is correctly set to `Phone` (line 476), but if results are empty, we need to verify the query is running.

Also ensure the search term is being passed correctly and the component properly renders agent-type results.

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Fix 3 trigger functions + add 3 task automations |
| `src/components/ui/button-filter-builder.tsx` | Add `optionLabels` support |
| `src/components/lead-details/DetailsTab.tsx` | Remove duplicate fields |
| `src/components/AppSidebar.tsx` | Debug agent search |

---

## Database Functions to Update

| Function | Issue | Fix |
|----------|-------|-----|
| `execute_lead_created_automations` | Uses auth UUID as created_by | Map to CRM user ID |
| `execute_pipeline_stage_changed_automations` | Uses auth UUID as created_by + needs HSCI task | Map to CRM user ID + add teammate fallback |
| `execute_disclosure_status_changed_automations` | Wrong trigger_type lookup | Use 'status_changed' + field check |
| `execute_loan_status_changed_automations` | No condition support for Condo | Add condition_field check |

---

## New Task Automations to Add

| Name | Trigger | Due Date | Assignee |
|------|---------|----------|----------|
| Home Search Check In (HSCI) | Pre-Qualified stage | +7 days | Lead's teammate |
| Order Title Work | loan_status = RFP | Today | Ashley |
| Condo Approval | loan_status = RFP + property_type = Condo | Today | Ashley |
