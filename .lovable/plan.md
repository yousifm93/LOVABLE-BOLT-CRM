
# Active Pipeline Refinements for Processor Role

## Overview
Two additional refinements for the Processor role on the Active pipeline page:
1. Hide the **USER** column from the table view ✅
2. Hide the **view toggle buttons** (Main View, Review, Processor Review, Activity Log, Edit pencil) ✅

---

## Change 1: Hide USER Column for Processors ✅

### Implementation
Added `filteredColumns` memo that excludes the 'team' column for users with `permissions?.admin === 'hidden'`.

```tsx
const filteredColumns = useMemo(() => {
  if (permissions?.admin === 'hidden') {
    return columns.filter(col => col.accessorKey !== 'team');
  }
  return columns;
}, [columns, permissions?.admin]);
```

---

## Change 2: Hide View Toggle Buttons for Processors ✅

### Implementation
Wrapped view buttons in conditional check:

```tsx
{permissions?.admin !== 'hidden' && (
  <>
    <Button>Main View</Button>
    <Button>Review</Button>
    <Button>Processor Review</Button>
    <Button>Activity Log</Button>
    <Button><Pencil /></Button>
  </>
)}
```

---

## Result for Processors

- No USER column visible
- No view toggle buttons visible
- Clean, focused view with just Search, Filter, Hide/Show controls

---

## Files Modified

1. **src/pages/Active.tsx**
   - Added `filteredColumns` memo (line ~1533)
   - Wrapped view buttons in admin permission check (line ~1605)
   - Updated CollapsiblePipelineSection components to use `filteredColumns`
