
# Plan: Fix Status Change Errors and Validation

## Summary

I've identified **4 critical issues** causing the errors you're experiencing:

---

## Issue 1: Database Trigger Functions Have Invalid SQL

**Root Cause**: The trigger functions contain code that tries to update columns that don't exist:
```sql
UPDATE task_automations 
SET execution_count = COALESCE(execution_count, 0) + 1,
    last_run_at = now()
WHERE id = automation_record.id;
```

The `task_automations` table does NOT have `execution_count` or `last_run_at` columns. This causes the entire transaction to fail with "column does not exist" and rolls back the task creation.

**Fix**: Create a new migration to remove these broken UPDATE statements from all 4 trigger functions:
- `execute_disclosure_status_changed_automations`
- `execute_loan_status_changed_automations`
- `execute_lead_created_automations`
- `execute_pipeline_stage_changed_automations`

---

## Issue 2: List View Status Dropdowns Bypass Validation

**Root Cause**: In `Active.tsx`, all status fields (disclosure, appraisal, title, condo, etc.) use plain `InlineEditSelect` instead of `ValidatedInlineSelect`. This means validation only works in the Lead Details drawer, not from the list view.

**Fix**: In `Active.tsx`, replace `InlineEditSelect` with `ValidatedInlineSelect` for these status fields:
- `disclosure_status`
- `appraisal_status`
- `title_status`
- `hoi_status`
- `condo_status`

This requires passing the loan data to each column cell for validation context.

---

## Issue 3: Remove "Ordered" from Title Status Options

**User Request**: "Ordered" and "Requested" are functionally the same for title. Remove "Ordered" and have "Requested" operate the same way.

**Fix**:
1. Remove "Ordered" from `titleStatusOptions` in both `Active.tsx` and `TitleTab.tsx`
2. Update `statusChangeValidation.ts` to apply the ETA requirement to "Requested" instead of "Ordered"
3. Update task automation completion requirement from `compound:title_ordered` to check for `title_status = Requested`

---

## Issue 4: Condo "Docs Received" Requires Complex Validation

**User Requirement**: Before changing condo status to "Docs Received":
1. A condo must be selected (condo_id populated)
2. All 3 documents must be uploaded on that condo (budget_doc, mip_doc, cq_doc)

**Fix**:
1. Update `statusChangeValidation.ts` to add a special rule for `condo_status` = "Received"
2. The validation function needs to check the related `condos` table for documents
3. Update `validateStatusChange()` to handle async validation (fetch condo documents)
4. Update `ValidatedInlineSelect` to support async validation

---

## Files to Modify

| File | Changes |
|------|---------|
| **New Database Migration** | Remove broken UPDATE statements from all 4 trigger functions |
| `src/pages/Active.tsx` | Replace status InlineEditSelect with ValidatedInlineSelect; remove "Ordered" from title options |
| `src/components/lead-details/TitleTab.tsx` | Remove "Ordered" from options |
| `src/services/statusChangeValidation.ts` | Update title rules to use "Requested"; add condo "Received" rule with async validation |
| `src/hooks/useStatusValidation.tsx` | Update to support async validation |
| `src/components/ui/validated-inline-select.tsx` | Support async validation and pass loan context |

---

## Technical Details

### Database Migration (Critical Fix)

```sql
-- Remove broken UPDATE statements from all trigger functions
-- They reference non-existent columns: execution_count, last_run_at

CREATE OR REPLACE FUNCTION execute_disclosure_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  v_due_date date;
  v_task_id uuid;
BEGIN
  FOR automation_record IN
    SELECT * FROM task_automations 
    WHERE is_active = true 
    AND trigger_type = 'status_changed'
    AND trigger_config->>'field' = 'disclosure_status'
    AND trigger_config->>'target_status' = NEW.disclosure_status::text
    -- ... conditions ...
  LOOP
    -- Calculate due date
    v_due_date := CURRENT_DATE + COALESCE((automation_record.due_date_offset_days)::integer, 0);
    
    -- Check if task already exists
    IF NOT EXISTS (...) THEN
      -- Create the task
      INSERT INTO tasks (...) VALUES (...) RETURNING id INTO v_task_id;
      
      -- REMOVED: The broken UPDATE to task_automations
      -- KEPT: The INSERT to task_automation_executions
      INSERT INTO task_automation_executions (...) VALUES (...);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Condo Async Validation

```typescript
// statusChangeValidation.ts
export async function validateCondoDocsReceived(lead: any): Promise<ValidationResult> {
  // Check if condo is selected
  if (!lead.condo_id) {
    return {
      isValid: false,
      message: 'Please select a condo before changing status to Docs Received',
      rule: { requires: 'condo_id', message: '...', actionLabel: 'Select Condo' }
    };
  }
  
  // Fetch condo documents
  const { data: condo } = await supabase
    .from('condos')
    .select('budget_doc, mip_doc, cq_doc')
    .eq('id', lead.condo_id)
    .single();
  
  const missing = [];
  if (!condo?.budget_doc) missing.push('Budget');
  if (!condo?.mip_doc) missing.push('MIP');
  if (!condo?.cq_doc) missing.push('Condo Questionnaire');
  
  if (missing.length > 0) {
    return {
      isValid: false,
      message: `Please upload the following documents: ${missing.join(', ')}`,
      rule: { requires: 'condo_documents', message: '...', actionLabel: 'Upload Documents' }
    };
  }
  
  return { isValid: true };
}
```

---

## Expected Results After Fix

1. **Disclosure status changes work** - No more "column does not exist" errors
2. **List view status validation** - Changing status from Active pipeline list enforces same rules as drawer
3. **Title status "Requested"** - Requires Title ETA before selecting (replaces "Ordered")
4. **Condo "Docs Received"** - Blocked until condo is selected AND all 3 documents are uploaded
5. **Appraisal status "Received"** - Blocked until appraisal report is uploaded (from both list and drawer)
6. **Task automations fire** - Because the trigger functions no longer fail on UPDATE
