
# Active Pipeline Refinements for Processor Role

## Overview
Two additional refinements for the Processor role on the Active pipeline page:
1. Hide the **USER** column from the table view
2. Hide the **view toggle buttons** (Main View, Review, Processor Review, Activity Log, Edit pencil)

---

## Change 1: Hide USER Column for Processors

### Current Behavior
- The "USER" column (team) shows multi-assignee avatars for every loan
- All users see this column

### New Behavior
- Processors will not see the USER column at all
- The column definition will be filtered out before rendering

### File Modified
**src/pages/Active.tsx**

### Implementation
Filter the columns array based on permission level:

```text
// After columns are created, filter out "team" column for non-admins
const filteredColumns = useMemo(() => {
  if (hasPermission('admin') === 'hidden') {
    return columns.filter(col => col.accessorKey !== 'team');
  }
  return columns;
}, [columns, hasPermission]);
```

This ensures:
- Admins see all columns including USER
- Processors see all columns EXCEPT USER
- Dynamic filtering based on permission system

---

## Change 2: Hide View Toggle Buttons for Processors

### Current Behavior
The header shows these buttons for all users:
- Main View
- Review
- Processor Review
- Activity Log
- Edit (pencil icon)

### New Behavior
Processors will NOT see any of these buttons - they'll just see:
- Search input
- Filter button
- Hide/Show columns button

### File Modified
**src/pages/Active.tsx** (lines ~1593-1756)

### Implementation
Wrap the view buttons in a conditional check:

```text
{hasPermission('admin') !== 'hidden' && (
  <>
    <Button variant={...}>Main View</Button>
    <Button variant={...}>Review</Button>
    <Button variant={...}>Processor Review</Button>
    <Button variant={...}>Activity Log</Button>
    <Button variant={...}><Pencil /></Button>
  </>
)}
```

---

## Technical Details

### Lines to Modify

| Location | Change |
|----------|--------|
| ~Line 1520-1530 | Add `filteredColumns` memo after columns creation |
| ~Lines 1593-1756 | Wrap view buttons in admin permission check |
| ~Lines 1791-1849 | Use `filteredColumns` instead of `columns` in CollapsiblePipelineSection components |

### Logic Flow
1. `usePermissions()` already imported and used (line 48)
2. `hasPermission` already available in the component
3. Check `hasPermission('admin') === 'hidden'` to identify Processors
4. Filter columns and conditionally render buttons

---

## Result for Processors

**Before:**
- See USER column with teammate avatars
- See Main View, Review, Processor Review, Activity Log, Edit buttons

**After:**
- No USER column visible
- No view toggle buttons visible
- Clean, focused view with just Search, Filter, Hide/Show controls

---

## Files Modified

1. **src/pages/Active.tsx**
   - Add column filtering for Processors
   - Conditionally hide view toggle buttons

No database changes required - this uses the existing permission system.
