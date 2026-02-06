
# Fix Right Column Width (Tasks & Stage History)

The `items-start` added to the right column (line 2722) causes children to shrink to their content width instead of filling the column. This is only needed on the center column (where it prevents the LeadCenterTabs card from stretching vertically). The right column doesn't need it.

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2722** -- Remove `flex flex-col items-start` from the right column, restoring its original classes:

```
// Before:
"space-y-4 overflow-y-auto flex flex-col items-start"

// After:
"space-y-4 overflow-y-auto"
```

This restores the Tasks and Stage History cards to their full column width while keeping the center column fix intact.
