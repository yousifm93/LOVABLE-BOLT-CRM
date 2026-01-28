

# Plan: Fix Lender Marketing Update System

## Root Cause Analysis

After investigating the code and database, I identified **three critical bugs**:

### Bug 1: Wrong Database Column Names
The edge function uses column names that **don't exist** in the lenders table:

| Code Uses (Wrong) | Database Has (Correct) |
|-------------------|------------------------|
| `product_dscr` | `product_fthb_dscr` |
| `product_foreign_national` | `product_fn` |
| `product_conventional` | `product_conv` |
| `product_bank_statement` | `product_bs_loan` |
| `product_p_l` | `product_pl_program` |
| `product_1099` | `product_1099_program` |

**Impact**: When the code tries to read `matchedLender["product_dscr"]`, it returns `undefined` because that column doesn't exist. The code then treats `undefined` as empty/null and creates duplicate suggestions - even though `product_fthb_dscr = 'Y'` already exists in the CRM.

### Bug 2: Missing Domain Mappings
`forwardlendingmtg.com` and other common lender domains are not in `LENDER_DOMAIN_MAPPINGS`. When the AI fails to extract the lender name, the fallback detection doesn't find it either.

### Bug 3: Orphaned Suggestions with No Lender Name
When new lender field suggestions are created, they're missing the `suggested_lender_name` - only the main `new_lender` entry gets the name. This causes the "Unknown Lender" grouping in the UI for related field suggestions.

---

## Implementation

### File: `supabase/functions/parse-lender-marketing-data/index.ts`

#### Change 1: Fix Field Mappings to Match Actual Database Columns

```typescript
// Lines 599-623 - Replace with correct column names
const fieldMappings: { extracted: keyof LenderMarketingData; db: string; display: string }[] = [
  { extracted: 'max_loan_amount', db: 'max_loan_amount', display: 'Max Loan Amount' },
  { extracted: 'min_loan_amount', db: 'min_loan_amount', display: 'Min Loan Amount' },
  { extracted: 'min_fico', db: 'min_fico', display: 'Min FICO' },
  { extracted: 'max_ltv', db: 'max_ltv', display: 'Max LTV' },
  { extracted: 'dscr_ltv', db: 'dscr_max_ltv', display: 'DSCR Max LTV' },
  { extracted: 'bank_statement_ltv', db: 'bs_loan_max_ltv', display: 'Bank Statement Max LTV' },
  // CORRECTED column names:
  { extracted: 'product_dscr', db: 'product_fthb_dscr', display: 'DSCR Product' },
  { extracted: 'product_bank_statement', db: 'product_bs_loan', display: 'Bank Statement Product' },
  { extracted: 'product_p_l', db: 'product_pl_program', display: 'P&L Product' },
  { extracted: 'product_1099', db: 'product_1099_program', display: '1099 Product' },
  { extracted: 'product_foreign_national', db: 'product_fn', display: 'Foreign National Product' },
  { extracted: 'product_conventional', db: 'product_conv', display: 'Conventional Product' },
  { extracted: 'product_itin', db: 'product_itin', display: 'ITIN Product' },
  { extracted: 'product_jumbo', db: 'product_jumbo', display: 'Jumbo Product' },
  { extracted: 'product_fha', db: 'product_fha', display: 'FHA Product' },
  { extracted: 'product_va', db: 'product_va', display: 'VA Product' },
  { extracted: 'product_heloc', db: 'product_heloc', display: 'HELOC Product' },
  { extracted: 'product_construction', db: 'product_construction', display: 'Construction Product' },
  { extracted: 'product_commercial', db: 'product_commercial', display: 'Commercial Product' },
  { extracted: 'product_non_warrantable_condo', db: 'product_nwc', display: 'Non-Warrantable Condo' },
];
```

#### Change 2: Add Missing Domain Mappings

```typescript
// Lines 104-129 - Add more domain mappings
const LENDER_DOMAIN_MAPPINGS: Record<string, string> = {
  // Existing mappings...
  'forwardlendingmtg.com': 'Forward Lending',
  'forwardlending.com': 'Forward Lending',
  'admortgage.com': 'A&D Mortgage',
  'a-dmortgage.com': 'A&D Mortgage',
  'kindlending.com': 'Kind Lending',
  'velocitymortgage.com': 'Velocity Mortgage',
  'cakemorgage.com': 'CAKE Mortgage',
  'caketpo.com': 'CAKE TPO',
  'openmortgage.com': 'Open Mortgage',
  'foundationmortgage.com': 'Foundation Mortgage',
  'unionhomemortgage.com': 'Union Home Mortgage',
  'classval.com': 'Class Valuation',
  // ... existing mappings
};
```

#### Change 3: Exclude "Unknown Lender" Suggestions Entirely

Add a guard to prevent any suggestions from being created when lender name is unknown:

```typescript
// After line 503 (after lender detection fallback), add:
// CRITICAL: Do NOT create suggestions for unknown lenders
if (!extractedData.lender_name || 
    extractedData.lender_name === 'Unknown Lender' || 
    extractedData.lender_name.toLowerCase().includes('unknown')) {
  console.log('[parse-lender-marketing-data] Skipping email - could not identify lender');
  return new Response(JSON.stringify({
    success: false,
    reason: 'Could not identify lender from email',
    data: extractedData,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

#### Change 4: Propagate Lender Name to All New Lender Suggestions

When creating suggestions for a new lender, ensure ALL suggestions (not just the `new_lender` entry) include the `suggested_lender_name`:

```typescript
// Lines 787-798 - Update suggestion records to always include lender name
const suggestionRecords = suggestions.map(s => ({
  email_log_id: emailLogId,
  lender_id: matchedLender?.id || null,
  is_new_lender: !matchedLender,  // Mark ALL suggestions as new lender if no match
  suggested_lender_name: !matchedLender ? extractedData.lender_name : null,  // Always include name for new lenders
  field_name: s.field_name,
  current_value: s.current_value,
  suggested_value: s.suggested_value,
  confidence: s.confidence,
  reason: `${s.reason} | Source: ${subject || 'Unknown subject'}`,
  status: 'pending',
}));
```

---

## Expected Results After Fix

| Issue | Before | After |
|-------|--------|-------|
| A&D DSCR "Empty → Y" | Shows suggestion (wrong column name) | No suggestion (reads correct column) |
| A&D Conventional "Empty → Y" | Shows suggestion (wrong column name) | No suggestion (reads correct column) |
| Forward Lending as "Unknown" | Falls back to Unknown Lender | Detected via domain mapping |
| Orphaned suggestions | Shows as "Unknown Lender" in UI | All suggestions include lender name |
| Same product multiple times | Multiple duplicate suggestions | De-duplicated by correct column check |

---

## Post-Implementation

After deploying the fix, I'll:
1. Clear the current pending suggestions (again)
2. Re-process the last 48 hours of emails with the corrected logic
3. Verify the new suggestions show proper lender identification and no duplicates

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/parse-lender-marketing-data/index.ts` | Fix column mappings, add domain mappings, exclude unknown lenders, propagate lender names |

