
# Fix: Remove White Space in Leads Gray Bar Left Box

## Problem

The left column (Lead Status, Strength, Method, Source + Lead Creation Date) has excessive white space below the creation date. This happens because the parent grid uses `self-stretch` on the middle and right columns, and the tallest column (middle - Last Call/Text/Email) forces the entire row to be taller than needed. The left column stretches to match but has empty space at the bottom.

## Solution

Change the grid layout to use `items-start` instead of allowing stretch, so each column is only as tall as its content. Since the middle column (Last Call/Text/Email) is naturally the tallest, the left and right columns will no longer have empty white space.

Alternatively, and more aligned with the user's goal: make all 3 columns match the height of the LEFT column (the shortest one). This means constraining the overall row height so there's no extra space.

The simplest approach: remove the `mt-3 pt-3` spacing on the Lead Creation Date row and tighten the overall padding, then add `items-start` to the grid so columns don't stretch beyond their content.

## File: `src/components/ClientDetailDrawer.tsx`

### Change 1: Grid alignment (line 1004)
Change the grid from default stretch to `items-start` so columns only take the height they need:
- `grid grid-cols-[1fr_1fr_auto] gap-6 flex-1` becomes `grid grid-cols-[1fr_1fr_auto] gap-6 items-start`

### Change 2: Reduce bottom spacing on Lead Creation Date (lines 1112-1116)
Reduce the `mt-3 pt-3` to `mt-2 pt-2` so there's less gap between the 2x2 grid and the creation date.

### Change 3: Remove `self-stretch` from middle column (line 1074)
Change `self-stretch` to `self-start` so it doesn't force extra height.

### Change 4: Remove `self-stretch` from right column (line 1098)
Change `self-stretch` to `self-start` so it doesn't force extra height.

This ensures all three boxes sit at their natural content height with no wasted white space, and the bottom borders visually align.
