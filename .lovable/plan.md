

# Plan: Fix Status Change Validation and Task Completion

## Summary of Issues Found

Your status validation and task automation system has **5 critical problems**:

1. **Disclosure status trigger SQL error**: The `execute_disclosure_status_changed_automations` function has a type mismatch comparing `text` to `disclosure_status` enum without casting
2. **Status dropdowns not validated**: Appraisal, Title, Insurance, and Condo status dropdowns use regular `InlineEditSelect` instead of `ValidatedInlineSelect` - so no document upload requirements are enforced
3. **Task completion validation not being called**: When marking tasks as Done, the validation isn't being triggered
4. **Auto-complete not triggered on status updates**: The frontend isn't calling `autoCompleteTasksAfterFieldUpdate` when status fields are updated
5. **"Ordered" status not in title_status options**: Title status dropdown only has Requested/Received/On Hold - missing "Ordered"

---

## Fix 1: Database - Fix SQL Type Error in Disclosure Trigger

**Problem**: Line 20 in the trigger compares `text = disclosure_status_enum` which PostgreSQL doesn't support.

**Current code**:
```sql
AND trigger_config->>'target_status' = NEW.disclosure_status
```

**Fix**: Explicitly cast the enum to text:
```sql
AND trigger_config->>'target_status' = NEW.disclosure_status::text
```

**Migration needed**: Update all 4 status trigger functions to use `::text` casts on enum comparisons.

---

## Fix 2: Frontend - Use ValidatedInlineSelect for All Status Fields

**Problem**: `TitleTab.tsx`, `CondoTab.tsx`, `AppraisalTab.tsx`, and `InsuranceTab.tsx` use plain `InlineEditSelect` which doesn't enforce document upload requirements.

**Solution**: Replace `InlineEditSelect` with `ValidatedInlineSelect` in:

| File | Field | Import Change |
|------|-------|---------------|
| `src/components/lead-details/AppraisalTab.tsx` | `appraisal_status` | Add ValidatedInlineSelect |
| `src/components/lead-details/TitleTab.tsx` | `title_status` | Add ValidatedInlineSelect |
| `src/components/lead-details/InsuranceTab.tsx` | `hoi_status` | Add ValidatedInlineSelect |
| `src/components/lead-details/CondoTab.tsx` | `condo_status` | Add ValidatedInlineSelect |

Each change will:
1. Import `ValidatedInlineSelect`
2. Pass `fieldName` (e.g., `"appraisal_status"`)
3. Pass the full `lead` object for validation context
4. Add `onUploadAction` handler to navigate to document upload

---

## Fix 3: Add "Ordered" to Title Status Options

**Problem**: Your compound requirement `compound:title_ordered` expects `title_status = 'Ordered'` but the dropdown only shows: Requested, Received, On Hold.

**Solution**: Add "Ordered" to the title status options in `TitleTab.tsx`:

```typescript
const titleStatusOptions = [
  { value: 'Ordered', label: 'Ordered' },
  { value: 'Requested', label: 'Requested' },
  { value: 'Received', label: 'Received' },
  { value: 'On Hold', label: 'On Hold' },
];
```

---

## Fix 4: Update statusChangeRules for Ordered Status

**Problem**: The `statusChangeValidation.ts` doesn't have rules for "Ordered" status requiring ETA fields.

**Solution**: Add rules for title and condo "Ordered" status in `statusChangeValidation.ts`:

```typescript
title_status: {
  'Received': {
    requires: 'title_file',
    message: 'Upload the title work to change status to Received',
    actionLabel: 'Upload Title File',
    actionType: 'upload_file'
  },
  'Ordered': {
    requires: 'title_eta',
    message: 'Enter a Title ETA before setting status to Ordered',
    actionLabel: 'Set Title ETA',
    actionType: 'set_field'
  }
},
condo_status: {
  'Approved': {
    requires: 'condo_file',
    message: 'Upload condo documents to change status to Approved',
    actionLabel: 'Upload Condo Documents',
    actionType: 'upload_file'
  },
  'Ordered': {
    requires: ['condo_ordered_date', 'condo_eta'],
    message: 'Enter Order Date and ETA before setting status to Ordered',
    actionLabel: 'Set Order Details',
    actionType: 'set_field'
  }
}
```

---

## Fix 5: Task Completion Validation Enforcement

**Problem**: Tasks can be marked as Done without the completion requirement being checked.

**Solution**: Ensure the task update handler in `TaskDetailModal.tsx` and task board components always call `validateTaskCompletion()` before allowing status change to "Done".

The modal already has validation logic, but we need to verify it's being called in all places tasks are marked complete (task list checkboxes, task board drag-drop, etc.).

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Fix type casting in all 4 status trigger functions |
| `src/components/lead-details/AppraisalTab.tsx` | Use ValidatedInlineSelect |
| `src/components/lead-details/TitleTab.tsx` | Use ValidatedInlineSelect, add "Ordered" option |
| `src/components/lead-details/InsuranceTab.tsx` | Use ValidatedInlineSelect |
| `src/components/lead-details/CondoTab.tsx` | Use ValidatedInlineSelect |
| `src/services/statusChangeValidation.ts` | Add Ordered status rules for title & condo |

---

## Technical Details

### Type Casting in PostgreSQL Triggers
PostgreSQL enums cannot be directly compared to text without explicit casting. All status fields (disclosure_status, loan_status, appraisal_status, etc.) are likely enums, so any comparison with JSON text values must use `::text`:

```sql
-- Wrong (causes "operator does not exist: text = enum_type")
AND trigger_config->>'field' = NEW.disclosure_status

-- Correct
AND trigger_config->>'field' = NEW.disclosure_status::text
```

### ValidatedInlineSelect Props
```typescript
<ValidatedInlineSelect
  value={data.appraisal_status}
  options={appraisalStatusOptions}
  onValueChange={(value) => onUpdate('appraisal_status', value)}
  fieldName="appraisal_status"  // NEW: Required for validation
  lead={leadData}               // NEW: Required for validation context
  placeholder="Select status"
  showAsStatusBadge={true}
  onUploadAction={() => {       // NEW: Navigate to upload section
    // Scroll to document upload area or open upload modal
  }}
/>
```

---

## Expected Results After Fix

1. **Disclosure status**: Changes work without SQL errors; tasks are created when disclosure status changes
2. **Appraisal status to Received**: Blocked until appraisal report is uploaded
3. **Title status to Ordered**: Requires Title ETA to be set first
4. **Title status to Received**: Blocked until title file is uploaded
5. **Condo status to Ordered**: Requires Order Date and ETA
6. **Condo status to Approved**: Blocked until condo documents uploaded
7. **Insurance status to Received**: Blocked until insurance policy is uploaded
8. **Tasks with completion requirements**: Cannot be manually completed until requirements are met

