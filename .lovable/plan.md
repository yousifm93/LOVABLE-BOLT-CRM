

# Plan: Reduce Font Size for Final Totals

## Summary

1. **Confirm current defaults are saved** - The current `DEFAULT_FIELD_POSITIONS` already has all the positions you've calibrated (x: 280 for left column fields, x: 555 for right column fields) - these are permanently saved in the code.

2. **Reduce font size for final totals** - Change `totalMonthlyPayment` and `totalCashToClose` from fontSize 9 to fontSize 8 (slightly smaller).

3. **About the bold weight** - The fonts available are OpenSans-Regular and OpenSans-Bold. Unfortunately there's no semi-bold option, so we'll keep them as `bold: true` but the smaller size (8 vs 9) will make them appear less prominent overall.

---

## Code Changes

### File: `src/lib/loanEstimatePdfGenerator.ts`

**Line 120 - Update totalMonthlyPayment:**
```typescript
// Before
totalMonthlyPayment: { x: 280, y: 523, rightAlign: true, bold: true, fontSize: 9 },

// After
totalMonthlyPayment: { x: 280, y: 523, rightAlign: true, bold: true, fontSize: 8 },
```

**Line 127 - Update totalCashToClose:**
```typescript
// Before
totalCashToClose: { x: 555, y: 523, rightAlign: true, bold: true, fontSize: 9 },

// After
totalCashToClose: { x: 555, y: 523, rightAlign: true, bold: true, fontSize: 8 },
```

---

## Result

| Field | Current | After |
|-------|---------|-------|
| `totalMonthlyPayment` | fontSize: 9, bold | fontSize: 8, bold |
| `totalCashToClose` | fontSize: 9, bold | fontSize: 8, bold |

All other defaults remain unchanged:
- Top info fields: fontSize 8
- Fee line items: fontSize 7
- Section totals (A/B/C/D): fontSize 8

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Reduce fontSize from 9 to 8 for totalMonthlyPayment and totalCashToClose |

