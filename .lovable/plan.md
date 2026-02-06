

# Increase Stage History Fixed Height to 360px

## Problem
340px is almost right but still slightly short of aligning with the Lead Information section. 400px would overshoot.

## Analysis
- **Tasks box content**: fixed at 88px
- **Each CardHeader**: ~44px
- **Gap between cards (space-y-4)**: 16px
- Adding 20px to the current 340px should close the remaining gap

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2950** -- Change 340px to 360px:

```
Before:
<CardContent className="space-y-2 bg-gray-50 min-h-[340px] max-h-[340px] overflow-y-auto">

After:
<CardContent className="space-y-2 bg-gray-50 min-h-[360px] max-h-[360px] overflow-y-auto">
```

This adds 20px which should align the bottom of the Stage History box with the Lead Information section without overshooting.

