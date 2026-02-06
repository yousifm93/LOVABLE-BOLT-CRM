

# Increase Stage History Fixed Height to Match Lead Information Box

## Problem
The current fixed height of 280px is too short -- the Stage History box doesn't extend far enough to align with the bottom of the Lead Information box on the left side.

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2950** -- Increase fixed height from 280px to 340px:

```
Before:
<CardContent className="space-y-2 bg-gray-50 min-h-[280px] max-h-[280px] overflow-y-auto">

After:
<CardContent className="space-y-2 bg-gray-50 min-h-[340px] max-h-[340px] overflow-y-auto">
```

This gives the Stage History box enough height to align with the Lead Information section while still scrolling if dates cause content to overflow.

