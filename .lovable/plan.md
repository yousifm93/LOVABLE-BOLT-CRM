

# Decrease Font Sizes in Stage History Box

## Problem
The text inside the Stage History box is slightly too large. The stage labels, dates, and "X days ago" text should all be about 2 points smaller.

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

Three text size reductions:

1. **Line 3091** -- Stage row container: change `text-sm` to `text-xs`
   ```
   Before: className="flex items-center gap-3 text-sm"
   After:  className="flex items-center gap-3 text-xs"
   ```

2. **Line 3092** -- Checkmark circle: change `text-xs` to `text-[10px]` and shrink circle from `w-6 h-6` to `w-5 h-5`
   ```
   Before: className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
   After:  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
   ```

3. **Line 3140** -- "X days ago" text: change `text-xs` to `text-[10px]`
   ```
   Before: className="text-xs text-muted-foreground mt-1 cursor-help"
   After:  className="text-[10px] text-muted-foreground mt-1 cursor-help"
   ```

This reduces the stage label font from ~14px (text-sm) to ~12px (text-xs), and the date/days-ago font from ~12px (text-xs) to ~10px (text-[10px]), achieving roughly a 2-point reduction across the board.

