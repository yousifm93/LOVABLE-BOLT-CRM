
# Plan: Fix Status Change Errors and Upload Button Functionality

## Summary

I've identified the root causes of all your issues:

1. **"column task_status does not exist" error** - Database triggers reference wrong column name
2. **Upload buttons don't work** - No handler is passed to open the upload dialog
3. **Disclosure task trigger** - Already correctly set to "Sent" in database, but status changes fail due to issue #1

---

## Part 1: Fix Database Trigger Functions (Critical)

### Root Cause
The trigger functions reference `task_status` but the actual column in the `tasks` table is called `status`:

```sql
-- WRONG (current code)
WHERE borrower_id = NEW.id 
  AND automation_id = automation_record.id
  AND task_status != 'Archived'  -- This column doesn't exist!

-- CORRECT (fix)
WHERE borrower_id = NEW.id 
  AND automation_id = automation_record.id
  AND status != 'Archived'  -- Use the actual column name
```

### Fix Required
Create a database migration to update all 4 trigger functions:
- `execute_disclosure_status_changed_automations`
- `execute_loan_status_changed_automations`
- `execute_lead_created_automations`
- `execute_pipeline_stage_changed_automations`

Change all occurrences of `task_status` to `status` in the EXISTS check.

---

## Part 2: Fix Upload Button Functionality

### Root Cause
The `ValidatedInlineSelect` component in `Active.tsx` doesn't pass an `onUploadAction` handler:

```typescript
// Current code - missing onUploadAction
<ValidatedInlineSelect
  value={row.original.loan_status || ''}
  options={loanStatusOptions}
  onValueChange={(value) => handleUpdate(row.original.id, "loan_status", value)}
  fieldName="loan_status"
  lead={row.original}
  // onUploadAction is not defined! Button does nothing
/>
```

### Fix Required
1. Create an `onUploadAction` handler that opens the lead drawer and navigates to the correct tab
2. Pass the handler to all `ValidatedInlineSelect` instances in `Active.tsx`
3. The handler should:
   - Open the lead detail drawer for that row
   - Navigate to the appropriate tab (Documents, Loan & Property, etc.)
   - Optionally scroll to the upload section

### Implementation

```typescript
// In Active.tsx - add a helper function
const handleUploadAction = async (loanId: string, fieldName: string) => {
  // Open the drawer for this loan
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    await handleRowClick(loan);
    // The drawer will open - user can navigate to the relevant section
    toast({
      title: "Upload Required",
      description: "Please upload the required document in the lead drawer.",
    });
  }
};

// Then pass to each ValidatedInlineSelect
<ValidatedInlineSelect
  value={row.original.loan_status || ''}
  options={loanStatusOptions}
  onValueChange={(value) => handleUpdate(row.original.id, "loan_status", value)}
  fieldName="loan_status"
  lead={row.original}
  onUploadAction={() => handleUploadAction(row.original.id, 'loan_status')}  // NEW
/>
```

---

## Part 3: Verify Disclosure Task Trigger is Correct

The database shows the task automation is already correctly configured:

| Automation | Trigger | Target Status |
|------------|---------|---------------|
| Upload disclosure document | disclosure_status | **Sent** ✓ |

This is correct! The tasks will be created once the database trigger error (Part 1) is fixed.

---

## Files to Modify

| File | Changes |
|------|---------|
| **New Database Migration** | Fix `task_status` → `status` in all 4 trigger functions |
| `src/pages/Active.tsx` | Add `onUploadAction` handler to all `ValidatedInlineSelect` instances |

---

## Technical Details

### Database Migration SQL

```sql
-- Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION execute_disclosure_status_changed_automations()
RETURNS trigger AS $$
-- ... same body but change:
--   AND task_status != 'Archived'
-- to:
--   AND status != 'Archived'
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same fix for execute_loan_status_changed_automations
```

### Status Fields Requiring Upload Actions

| Field | Required Document | Tab to Open |
|-------|-------------------|-------------|
| `disclosure_status` → Sent/Signed | `disc_file` | Documents |
| `loan_status` → AWC | `initial_approval_file` | Documents |
| `appraisal_status` → Received | `appraisal_file` | Third Party Items > Appraisal |
| `title_status` → Received | `title_file` | Third Party Items > Title |
| `hoi_status` → Received | `insurance_policy_file` | Third Party Items > Insurance |
| `condo_status` → Approved | `condo_file` | Third Party Items > Condo |

---

## Expected Results After Fix

1. **Status changes work** - No more "column task_status does not exist" errors
2. **Tasks are created** - When disclosure status changes to "Sent", the upload task will be created
3. **Upload buttons open drawer** - Clicking "Upload Initial Approval" in the modal will open the lead drawer where user can upload

---

## Testing Steps

1. Change disclosure status to "Sent" on any loan
   - Should work without errors
   - Should create "Upload disclosure document" task
   
2. Try to change loan status to "AWC" without initial approval
   - Modal should appear asking to upload
   - Click "Upload Initial Approval" → drawer opens
   
3. Upload the initial approval document, then try AWC again
   - Should now allow the status change
