
# Plan: Fix Right-Alignment for Top-Left Info Section

## Problem Identified

The top-left info section fields (`borrowerName`, `lenderLoanNumber`, `zipState`, `date`) are currently **left-aligned** - they do NOT have `rightAlign: true`. This means longer text extends to the right, breaking alignment.

The `rightAlign` logic in the code is correct (it calculates text width and subtracts from X), but it's simply not enabled for these fields.

## Solution

Add `rightAlign: true` to all four top-left fields and set them to the same X coordinate based on your calibration findings:
- Loan Number: **x: 251** (your calibrated value)
- Zip/State: **x: 248** (your calibrated value)
- Date: Keep as reference point (appears to be around **x: 251** based on current visual)
- Borrower Name: Match date alignment at **x: 251**

---

## Code Changes

### File: `src/lib/loanEstimatePdfGenerator.ts`

Update `DEFAULT_FIELD_POSITIONS` (lines 77-80):

**Current:**
```typescript
// Top info section - LEFT column (font size 8)
borrowerName: { x: 232, y: 121, fontSize: 8 },
lenderLoanNumber: { x: 248, y: 132, fontSize: 8 },
zipState: { x: 245, y: 143, fontSize: 8 },
date: { x: 244, y: 154, fontSize: 8 },
```

**Updated:**
```typescript
// Top info section - LEFT column (right-aligned, font size 8)
borrowerName: { x: 251, y: 121, rightAlign: true, fontSize: 8 },
lenderLoanNumber: { x: 251, y: 132, rightAlign: true, fontSize: 8 },
zipState: { x: 248, y: 143, rightAlign: true, fontSize: 8 },
date: { x: 251, y: 154, rightAlign: true, fontSize: 8 },
```

---

## How Right-Align Works

With `rightAlign: true`, the X coordinate represents where the **right edge** of the text will be positioned:

```text
Without rightAlign (current - LEFT aligned):
X=232
 |
 v
 Rakesh Lakkimsetty
 1187878
 33132/FL
 1/30/2026
 
Different lengths = ragged right edge ❌


With rightAlign: true (proposed - RIGHT aligned):
                   X=251
                     |
                     v
    Rakesh Lakkimsetty|
               1187878|
             33132/FL |
            1/30/2026 |
            
All right edges aligned at X=251 ✓
```

---

## Fine-Tuning Notes

Based on your testing:
- **Loan Number** at X: 251 aligns with the date's right edge
- **Zip/State** at X: 248 looks correct (slightly narrower box width on template)
- **Date** is your reference point for the right indent

If further tweaks are needed, you can use the Calibrate Positions panel to adjust individual X values - but now all four fields will have their **right edges** anchored to their X positions, so longer/shorter text won't break alignment.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Add `rightAlign: true` to borrowerName, lenderLoanNumber, zipState, date and update X coordinates |
