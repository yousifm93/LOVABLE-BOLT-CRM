

# Leads Gray Bar: Replace "Likely to Apply" with "Referral Source" and Equalize Box Heights

## Changes

### 1. Replace "Likely to Apply" with "Referral Source" in the 2x2 grid

In the Leads stage gray bar (lines 1054-1087):
- Remove the "Likely to Apply" field (lines 1055-1070)
- Move "Referral Source" into that slot (remove its current `col-span-2` placement at lines 1072-1087)
- "Referral Source" becomes the 4th field in the 2x2 grid (alongside Lead Status, Lead Strength, Referral Method)

The resulting 2x2 layout will be:
```
Lead Status       | Lead Strength
Referral Method   | Referral Source
```

### 2. Equalize heights of all 3 boxes

Currently the left box (with 3 rows + Referral Source spanning below) is taller than the middle (Last Call/Text/Email) and right (Monthly Payment Goal) boxes. After removing the extra row, the left box shrinks to a clean 2x2. To make all 3 boxes the same height, each column in the grid will use `self-stretch` so they all match the tallest box's height. The middle and right boxes will also stretch to fill the available space.

## Technical Details

**File**: `src/components/ClientDetailDrawer.tsx`

**Before (left column, lines 1006-1087):**
```
Lead Status    | Lead Strength
Referral Method | Likely to Apply    <-- remove
Referral Source (col-span-2)         <-- move up
```

**After (left column):**
```
Lead Status     | Lead Strength
Referral Method | Referral Source
```

- Remove lines 1055-1070 (Likely to Apply field)
- Replace lines 1072-1087 (Referral Source with col-span-2) with Referral Source without col-span-2, placed in the 4th grid slot
- Add height-matching classes to the 3 column containers so they all stretch equally
