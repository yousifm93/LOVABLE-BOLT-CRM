
# Plan: Fix CRM Issues & Enhance Condition Audit

## Status: COMPLETED ✅

All issues have been fixed:

### Issue 1: Condition Audit Table Improvements ✅
- **Fixed**: Removed truncation from Condition column, increased width to 400px
- **Fixed**: Added "Needed From" field to condition create/edit forms in `ConditionsTab.tsx`

### Issue 2: Pipeline Stage Update Failures ✅
- **Fixed**: Created migration to fix `auto_complete_followup_on_screening` trigger
- The trigger now uses `updated_at` instead of non-existent `completed_at` column

### Issue 3: Appraisal Status Auto-Flip + Validation Modal ✅
- **Fixed**: Added `StatusChangeRequirementModal` in `Active.tsx` to block manual status changes to "Received" when no appraisal file exists

### Issue 4: PendingApp to Screening Refresh ✅
- **Fixed**: Added `fetchLeads()` call after "App Complete" status change to properly refresh the view

---

## Changes Made

| File | Changes |
|------|---------|
| `src/components/admin/ConditionAuditTable.tsx` | Increased condition column width to 400, removed truncation |
| `src/components/lead-details/ConditionsTab.tsx` | Added "Needed From" field to formData, bulkConditions, and both forms |
| `src/pages/Active.tsx` | Added appraisal validation modal, replaced toast with StatusChangeRequirementModal |
| `src/pages/PendingApp.tsx` | Added fetchLeads() call after App Complete status change |
| `supabase/migrations/...` | Fixed auto_complete_followup_on_screening trigger function |
