
# Status Change Errors and Upload Button Functionality - COMPLETED

## Summary

Fixed all issues identified in the approved plan:

---

## ✅ Part 1: Database Trigger Functions Fixed

### Root Cause
The trigger functions referenced `task_status` but the actual column in the `tasks` table is called `status`.

### Fix Applied
Created a database migration that updated all 4 trigger functions:
- `execute_disclosure_status_changed_automations` - ✅ Fixed
- `execute_loan_status_changed_automations` - ✅ Fixed
- `execute_pipeline_stage_changed_automations` - ✅ Fixed
- `execute_lead_created_automations` - Already correct (uses different pattern)

Changes made:
- Changed `task_status` to `status` in EXISTS check
- Changed `task_status` to `status` in INSERT statement
- Changed `task_priority` to `priority` column
- Changed `assigned_to` to `assignee_id` column

---

## ✅ Part 2: Upload Button Functionality Fixed

### Root Cause
The `ValidatedInlineSelect` components in `Active.tsx` were missing the `onUploadAction` handler.

### Fix Applied
1. Updated `createColumns` function to accept an `onUploadAction` parameter
2. Added `handleUploadAction` function that opens the lead drawer when clicked
3. Passed `onUploadAction` to all 7 `ValidatedInlineSelect` instances:
   - `disclosure_status`
   - `loan_status`
   - `appraisal_status`
   - `title_status`
   - `hoi_status`
   - `condo_status`

---

## Expected Results

1. **Status changes work** - No more "column task_status does not exist" errors
2. **Tasks are created** - When disclosure status changes to "Sent", the upload task will be created
3. **Upload buttons open drawer** - Clicking "Upload Initial Approval" in the modal will open the lead drawer where user can upload

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/migrations/` | Fixed trigger functions with correct column names |
| `src/pages/Active.tsx` | Added `onUploadAction` handler to all `ValidatedInlineSelect` instances |
