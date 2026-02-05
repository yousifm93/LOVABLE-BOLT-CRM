
# Fix Date Formatting & Hide Borrower Stage for Processors

## ✅ COMPLETED

### Fix 1: InlineEditDate Smart Year Display
Updated `src/components/ui/inline-edit-date.tsx` to conditionally hide the year when dates are in the current year.

### Fix 2: Hide Borrower Stage for Processors  
Updated `src/pages/TasksModern.tsx` to:
1. Added `isProcessor` role check
2. Added `isProcessor` parameter to columns function
3. Filter out `borrower.pipeline_stage.name` column for Processor role

### Files Modified
- `src/components/ui/inline-edit-date.tsx`
- `src/pages/TasksModern.tsx`
