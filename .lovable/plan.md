
# Pending App: Gray Section, Stage History, and Section Cleanup

## 1. Gray Top Section -- Replace LTV with Credit Score (lines 1164-1167)

Remove the LTV field and replace it with Credit Score, keeping the same 2x2 grid. The Credit Score field currently sits below as a `col-span-2` row (lines 1186-1189) -- move it up into the LTV slot and remove the old Credit Score row.

**Before (4 fields + Credit Score spanning bottom):**
- Transaction Type | Lead Strength
- LTV | Likely to Apply
- Credit Score (col-span-2)

**After (4 fields, no bottom row):**
- Transaction Type | Lead Strength
- Credit Score | Likely to Apply

### Changes in `src/components/ClientDetailDrawer.tsx`:
- **Lines 1164-1167**: Replace the LTV field with Credit Score (use `localFicoScore ?? (client as any).fico_score ?? '—'`)
- **Lines 1186-1189**: Remove the `col-span-2` Credit Score row entirely

## 2. Remove DTI/PITI and Third Party Items from Pending App (lines 2331-2354)

Currently the DTI/Address/PITI section shows for `pending-app` (line 2335). Change the condition so it no longer matches `pending-app`. The Third Party Items section (line 2350) already excludes `leads`; add `pending-app` exclusion too.

- **Line 2335**: Change `opsStage === 'pending-app'` to something that excludes pending-app (e.g., `false` or remove it, since leads is already excluded -- effectively this section will show for no stage)
- **Line 2350**: Add `|| opsStage === 'pending-app'` to the exclusion

## 3. Fix Stage History Alignment (line 2726)

The right column (`space-y-4 overflow-y-auto`) has no `items-start`, so the Stage History card can stretch. Add `items-start` so cards shrink-wrap and align with the other columns' bottoms. Also, the bottom grid itself (line 2111) uses `flex-1` which causes vertical stretching -- this was the same pattern fixed for the center column. Add `items-start` to the right column wrapper to prevent the Stage History from bleeding past the other columns.

- **Line 2726**: Add `flex flex-col items-start` to the right column wrapper so children don't stretch

### Technical Summary

| File | Line(s) | Change |
|------|---------|--------|
| `ClientDetailDrawer.tsx` | 1164-1167 | Replace LTV with Credit Score |
| `ClientDetailDrawer.tsx` | 1186-1189 | Remove old Credit Score col-span-2 row |
| `ClientDetailDrawer.tsx` | 2335 | Exclude pending-app from DTI/PITI visibility |
| `ClientDetailDrawer.tsx` | 2350 | Add pending-app to Third Party Items exclusion |
| `ClientDetailDrawer.tsx` | 2726 | Add `items-start` to right column wrapper |
