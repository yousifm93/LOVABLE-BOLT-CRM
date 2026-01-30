

# Plan: Update Font Sizes to 7.5 and Add Dollar Sign Spacing for Totals

## Changes Overview

1. **Change font size from 8 to 7.5** for all top info fields (8 fields):
   - `borrowerName`, `lenderLoanNumber`, `zipState`, `date` (left column)
   - `purchasePrice`, `loanAmount`, `rateApr`, `loanTerm` (right column)

2. **Change font size from 7 to 7.5** for all fee line items (NOT the totals)

3. **Keep totals at fontSize 8** for section totals A, B, C, D

4. **Keep totals at fontSize 9 (bold)** for `totalMonthlyPayment` and `totalCashToClose`

5. **Add spacing between dollar sign and numbers** for totals - modify `formatCurrency` to add a space after the dollar sign for the larger total fields

---

## Code Changes

### File: `src/lib/loanEstimatePdfGenerator.ts`

#### Change 1: Update Top Info Fields (Lines 77-86)

| Field | Current fontSize | New fontSize |
|-------|------------------|--------------|
| `borrowerName` | 8 | 7.5 |
| `lenderLoanNumber` | 8 | 7.5 |
| `zipState` | 8 | 7.5 |
| `date` | 8 | 7.5 |
| `purchasePrice` | 8 | 7.5 |
| `loanAmount` | 8 | 7.5 |
| `rateApr` | 8 | 7.5 |
| `loanTerm` | 8 | 7.5 |

#### Change 2: Update All Fee Line Items (Lines 90-127)

| Field | Current fontSize | New fontSize |
|-------|------------------|--------------|
| `discountPoints` | 7 | 7.5 |
| `underwritingFee` | 7 | 7.5 |
| `appraisalFee` | 7 | 7.5 |
| `creditReportFee` | 7 | 7.5 |
| `processingFee` | 7 | 7.5 |
| `lendersTitleInsurance` | 7 | 7.5 |
| `titleClosingFee` | 7 | 7.5 |
| `intangibleTax` | 7 | 7.5 |
| `transferTax` | 7 | 7.5 |
| `recordingFees` | 7 | 7.5 |
| `prepaidHoi` | 7 | 7.5 |
| `prepaidInterest` | 7 | 7.5 |
| `escrowHoi` | 7 | 7.5 |
| `escrowTaxes` | 7 | 7.5 |
| `principalInterest` | 7 | 7.5 |
| `propertyTaxes` | 7 | 7.5 |
| `homeownersInsurance` | 7 | 7.5 |
| `mortgageInsurance` | 7 | 7.5 |
| `hoaDues` | 7 | 7.5 |
| `downPayment` | 7 | 7.5 |
| `closingCosts` | 7 | 7.5 |
| `prepaidsEscrow` | 7 | 7.5 |
| `adjustmentsCredits` | 7 | 7.5 |

#### Change 3: Keep Totals Unchanged

These stay as-is:
- `sectionATotal`, `sectionBTotal`, `sectionCTotal`, `sectionDTotal` → fontSize: 8
- `totalMonthlyPayment`, `totalCashToClose` → fontSize: 9, bold: true

#### Change 4: Add Spaced Currency Formatter for Totals (Lines 165-174)

Create a new formatter that adds a space after the dollar sign for totals:

```typescript
// Format currency with spaced dollar sign (for totals)
const formatCurrencySpaced = (value: number): string => {
  if (value === 0 || isNaN(value)) return '$ 0.00';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  // Add space after dollar sign: "$1,234.56" → "$ 1,234.56"
  return formatted.replace('$', '$ ');
};
```

Then update the calls for the 6 total fields to use this spaced formatter:
- `sectionATotal`, `sectionBTotal`, `sectionCTotal`, `sectionDTotal`
- `totalMonthlyPayment`, `totalCashToClose`

---

## Visual Summary

```text
BEFORE:
- Top info fields: fontSize 8
- Fee items: fontSize 7
- Section totals: fontSize 8, "$1,234.56"
- Final totals: fontSize 9 bold, "$1,234.56"

AFTER:
- Top info fields: fontSize 7.5 ✓
- Fee items: fontSize 7.5 ✓
- Section totals: fontSize 8, "$ 1,234.56" (spaced) ✓
- Final totals: fontSize 9 bold, "$ 1,234.56" (spaced) ✓
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Update DEFAULT_FIELD_POSITIONS fontSize values and add formatCurrencySpaced for totals |

