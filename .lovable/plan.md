

# Fix Tasks Box Height to Match Leads View

## Problem
The Tasks box uses a fixed height (`min-h-[112px] max-h-[112px]`) which creates too much empty space when there are no tasks in Pending App, pushing the Stage History section lower than the Lead Information section. In the Leads view with 2 actual tasks, the content fills the space naturally so it looks fine.

## Solution
Remove the forced minimum height so the box can shrink when empty or has fewer tasks, but keep the maximum height cap so it scrolls when there are more than 2 tasks.

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2857** -- Remove `min-h-[112px]` from the Tasks CardContent, keeping only `max-h-[112px]`:

```
Before:
<CardContent className="space-y-2 bg-gray-50 min-h-[112px] max-h-[112px] overflow-y-auto">

After:
<CardContent className="space-y-2 bg-gray-50 max-h-[112px] overflow-y-auto">
```

This way:
- 0 tasks: compact "No tasks yet" message, no wasted space
- 1 task: shows one task row naturally
- 2 tasks: fills to ~112px naturally (matches your Leads screenshot)
- 3+ tasks: caps at 112px with vertical scrolling
