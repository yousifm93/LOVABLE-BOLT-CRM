

# Fixed-Height Tasks Box

Make the Tasks card content area always display at a fixed height equivalent to exactly 2 task rows, regardless of how many tasks exist (0, 1, 2, or more). If there are more than 2, the user scrolls within the box.

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2857** -- Update the `CardContent` className to use both a fixed min-height and max-height so the box is always the same size:

```
// Before:
<CardContent className="space-y-2 bg-gray-50 max-h-[280px] overflow-y-auto">

// After:
<CardContent className="space-y-2 bg-gray-50 min-h-[112px] max-h-[112px] overflow-y-auto">
```

The `112px` value accommodates exactly 2 task rows (each ~44px for the title line + due date/assignee line + spacing) plus the card content padding. This ensures:
- 0 tasks: empty box stays the same height
- 1 task: box stays the same height with whitespace below
- 2 tasks: box fits perfectly
- 3+ tasks: vertical scroll appears within the fixed-height box
