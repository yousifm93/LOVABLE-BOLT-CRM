
# Fix Date Formatting & Hide Borrower Stage for Processors

## Problem Summary
1. **Close Date and Lock Expiration columns** on the Active Pipeline are still showing years (e.g., "Feb 3, 2026") because `InlineEditDate` has its own date formatting that always includes the year.
2. **Task Due column** shows "Feb 3" (no year) because it uses `formatDateModern` from `dateUtils.ts`.
3. **Borrower Stage column** needs to be hidden for Processor role on the Tasks page.

---

## Fix 1: Update InlineEditDate Display Logic

### Current Behavior (Line 50-52 of `src/components/ui/inline-edit-date.tsx`)
```typescript
const displayValue = dateValue && !isNaN(dateValue.getTime()) 
  ? dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
  : placeholder;
```

### New Behavior
Conditionally hide year when date is in current year:

```typescript
const displayValue = useMemo(() => {
  if (!dateValue || isNaN(dateValue.getTime())) return placeholder;
  
  const currentYear = new Date().getFullYear();
  const dateYear = dateValue.getFullYear();
  
  if (dateYear === currentYear) {
    return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}, [dateValue, placeholder]);
```

### Impact
This will fix date display everywhere `InlineEditDate` is used:
- Active Pipeline (Close Date, Lock Expiration)
- Past Clients, Pre-Approved, Screening, Pre-Qualified, Pending App pages
- Condos list, Tasks, etc.

---

## Fix 2: Hide Borrower Stage Column for Processors

### File: `src/pages/TasksModern.tsx`

### Current State
- The "Borrower Stage" column (`accessorKey: "borrower.pipeline_stage.name"`) is shown to everyone
- The page checks `crmUser?.role === 'Admin'` for other permissions but not column visibility

### Changes Required

**A. Add permission check for Processor role**
At line ~932 (where `isAdmin` is defined):
```typescript
const isAdmin = crmUser?.role === 'Admin';
const isProcessor = crmUser?.role === 'Processor';
```

**B. Filter out Borrower Stage column for Processors**
After generating columns, filter them:
```typescript
// Filter columns for Processor role
const roleFilteredColumns = useMemo(() => {
  if (isProcessor) {
    return generatedColumns.filter(col => col.accessorKey !== 'borrower.pipeline_stage.name');
  }
  return generatedColumns;
}, [generatedColumns, isProcessor]);
```

**C. Also hide from TASK_COLUMNS visibility for Processors**
The `TASK_COLUMNS` array controls the Hide/Show modal. Either:
- Filter `borrower_stage` from the visibility options, OR
- Let it remain in the modal but filter it from rendering

Simplest approach: Filter the columns after generation (option B above).

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/inline-edit-date.tsx` | Update `displayValue` to conditionally hide year for current year dates |
| `src/pages/TasksModern.tsx` | Add `isProcessor` check; filter out "Borrower Stage" column for Processors |

---

## Result

### Date Display
| Date | Before | After |
|------|--------|-------|
| Feb 3, 2026 | Feb 3, 2026 | Feb 3 |
| Feb 19, 2026 | Feb 19, 2026 | Feb 19 |
| Dec 15, 2025 | Dec 15, 2025 | Dec 15, 2025 |

### Tasks Page (Processor View)
- No "Borrower Stage" column visible
- All other columns unchanged
