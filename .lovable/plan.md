
# Match Pending App Gray Section to Leads Formatting

## Problem
The Pending App gray header section has slightly different CSS than the Leads section, causing:
- Extra cushion/padding in the communication box (middle column)
- Stage History extending lower than on Leads

## Changes (all in `src/components/ClientDetailDrawer.tsx`)

### 1. Fix Middle Column (Last Communication box) -- Line 1189
The Leads version uses `self-stretch` with no extra gap in rows. The Pending App version uses `self-start` and adds `gap-4` to each row, creating extra spacing.

- Change `self-start` to `self-stretch` on the communication box container
- Remove `gap-4` from each "Last Call/Text/Email" row (lines 1190, 1197, 1204) to match leads

### 2. Fix Right Column (Monthly Payment Goal) -- Line 1213
The Leads version uses `self-stretch` on the right column. Pending App is missing it.

- Add `self-stretch` to the right column wrapper

### Summary

| Location | Current (Pending App) | Target (Match Leads) |
|----------|----------------------|---------------------|
| Line 1189 (middle col) | `self-start inline-flex flex-col gap-1.5 ...` | `self-stretch inline-flex flex-col gap-1.5 ...` |
| Lines 1190, 1197, 1204 (rows) | `flex justify-between items-center gap-4` | `flex justify-between items-center` |
| Line 1213 (right col) | `space-y-3 min-w-[160px]` | `self-stretch space-y-3 min-w-[160px]` |

These small CSS alignment changes will make the gray section heights and spacing identical between Leads and Pending App.
