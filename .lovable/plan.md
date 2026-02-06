

# Fix Stage History Box to Fixed Height

## Problem
The Stage History box grows taller when dates are added to stages (because the "X days ago" text adds extra height per row). This causes misalignment with the Lead Information section. The box should always be the same fixed height regardless of how many dates are set.

## Solution
Set a fixed height on the Stage History `CardContent` with overflow scrolling, matching the height shown in the screenshot (all 6 stages visible with "Set date" placeholders).

## Change

### File: `src/components/ClientDetailDrawer.tsx`

**Line 2950** -- Add fixed height to the Stage History CardContent:

```
Before:
<CardContent className="space-y-2 bg-gray-50">

After:
<CardContent className="space-y-2 bg-gray-50 min-h-[280px] max-h-[280px] overflow-y-auto">
```

This locks the Stage History box at 280px (matching the screenshot height where all 6 stages with "Set date" are visible). When dates are added and rows grow taller, the content will scroll vertically instead of expanding the box.

