

# Plan: Revert Font Sizes and Remove Spaced Dollar Sign

## Summary

Revert the font size changes (back to 8 for top info fields, 7 for fee items) and remove the spaced dollar sign formatting so totals display as `$1,234.56` instead of `$ 1,234.56`.

---

## Code Changes

### File: `src/lib/loanEstimatePdfGenerator.ts`

#### Change 1: Revert Top Info Fields Back to fontSize 8 (Lines 77-86)

| Field | Current | Revert To |
|-------|---------|-----------|
| `borrowerName` | 7.5 | 8 |
| `lenderLoanNumber` | 7.5 | 8 |
| `zipState` | 7.5 | 8 |
| `date` | 7.5 | 8 |
| `purchasePrice` | 7.5 | 8 |
| `loanAmount` | 7.5 | 8 |
| `rateApr` | 7.5 | 8 |
| `loanTerm` | 7.5 | 8 |

#### Change 2: Revert Fee Line Items Back to fontSize 7 (Lines 90-127)

All individual fee fields revert from 7.5 back to 7:
- `discountPoints`, `underwritingFee`, `appraisalFee`, `creditReportFee`, `processingFee`, `lendersTitleInsurance`, `titleClosingFee`, `intangibleTax`, `transferTax`, `recordingFees`, `prepaidHoi`, `prepaidInterest`, `escrowHoi`, `escrowTaxes`, `principalInterest`, `propertyTaxes`, `homeownersInsurance`, `mortgageInsurance`, `hoaDues`, `downPayment`, `closingCosts`, `prepaidsEscrow`, `adjustmentsCredits`

#### Change 3: Remove Spaced Dollar Sign Formatter (Lines 176-187)

Delete the `formatCurrencySpaced` function entirely.

#### Change 4: Update Total Fields to Use Regular formatCurrency (Lines 282-321)

Change these 6 calls from `formatCurrencySpaced` back to `formatCurrency`:
- Line 282: `sectionATotal`
- Line 287: `sectionBTotal`
- Line 295: `sectionCTotal`
- Line 301: `sectionDTotal`
- Line 313: `totalMonthlyPayment`
- Line 321: `totalCashToClose`

---

## Result

After reverting:
- Top info fields: **fontSize 8** (borrowerName, loanNumber, etc.)
- Fee line items: **fontSize 7**
- Section totals A/B/C/D: fontSize 8
- Final totals: fontSize 9 bold
- All currency displays as `$1,234.56` (no space after dollar sign)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Revert all fontSize values and remove formatCurrencySpaced |

