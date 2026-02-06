

# Fix Tasks Box Height -- Use 88px Instead of 112px

## Problem
The current fixed height of `112px` is too tall, creating excess whitespace and pushing the Stage History section too far down. The desired height (matching your Leads screenshot) is shorter -- just enough to snugly fit 2 task rows.

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2857** -- Change both `min-h` and `max-h` from `112px` to `88px`:

```
Before:
<CardContent className="space-y-2 bg-gray-50 min-h-[112px] max-h-[112px] overflow-y-auto">

After:
<CardContent className="space-y-2 bg-gray-50 min-h-[88px] max-h-[88px] overflow-y-auto">
```

This reduces the fixed height to ~88px which matches the compact look in your Leads screenshot:
- 0 tasks: 88px (small empty space)
- 1 task: 88px
- 2 tasks: 88px (fills naturally, matching screenshot)
- 3+ tasks: 88px with vertical scrolling

