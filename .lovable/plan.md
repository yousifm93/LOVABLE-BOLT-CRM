

# Plan: Update Default Positions and Reduce Section Total Font Sizes

## Changes Overview

1. **Set all top-left info fields to X: 280** - Unify `borrowerName`, `lenderLoanNumber`, `zipState`, and `date` to have X coordinate of 280

2. **Reduce section total font sizes from 9 to 8** - Make the totals for Sections A, B, C, and D slightly smaller

---

## Code Changes

### File: `src/lib/loanEstimatePdfGenerator.ts`

**Lines 77-80 - Update top-left info section X values to 280:**

| Field | Current X | New X |
|-------|-----------|-------|
| `borrowerName` | 232 | 280 |
| `lenderLoanNumber` | 248 | 280 |
| `zipState` | 245 | 280 |
| `date` | 244 | 280 |

**Lines 89, 94, 102, 108 - Reduce section total font sizes:**

| Field | Current fontSize | New fontSize |
|-------|------------------|--------------|
| `sectionATotal` | 9 | 8 |
| `sectionBTotal` | 9 | 8 |
| `sectionCTotal` | 9 | 8 |
| `sectionDTotal` | 9 | 8 |

---

## Updated Code

```typescript
// Top info section - LEFT column (right-aligned, font size 8)
borrowerName: { x: 280, y: 121, rightAlign: true, fontSize: 8 },
lenderLoanNumber: { x: 280, y: 132, rightAlign: true, fontSize: 8 },
zipState: { x: 280, y: 143, rightAlign: true, fontSize: 8 },
date: { x: 280, y: 154, rightAlign: true, fontSize: 8 },

// Section A: Lender Fees (items 7, total 8 - reduced from 9)
sectionATotal: { x: 280, y: 192, rightAlign: true, fontSize: 8 },

// Section B: Third Party Fees (items 7, total 8 - reduced from 9)
sectionBTotal: { x: 280, y: 275, rightAlign: true, fontSize: 8 },

// Section C: Taxes & Government Fees (items 7, total 8 - reduced from 9)
sectionCTotal: { x: 555, y: 192, rightAlign: true, fontSize: 8 },

// Section D: Prepaids & Escrow (items 7, total 8 - reduced from 9)
sectionDTotal: { x: 555, y: 275, rightAlign: true, fontSize: 8 },
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Update DEFAULT_FIELD_POSITIONS with X: 280 for all top-left fields and fontSize: 8 for section totals |

