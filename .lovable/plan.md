

# Fixed-Height Tasks Box (Always Same Height)

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2857** -- Add back `min-h-[112px]` so the box is always exactly the same height regardless of task count:

```
Before:
<CardContent className="space-y-2 bg-gray-50 max-h-[112px] overflow-y-auto">

After:
<CardContent className="space-y-2 bg-gray-50 min-h-[112px] max-h-[112px] overflow-y-auto">
```

This sets both min and max to 112px, making the Tasks box a fixed 112px tall at all times:
- 0 tasks: 112px (with empty space)
- 1 task: 112px (with some empty space)
- 2 tasks: 112px (fills naturally)
- 3+ tasks: 112px with vertical scrolling

This is the exact same change from the first plan that was working correctly -- it was mistakenly reverted in the second plan.

