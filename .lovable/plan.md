

# Plan: Fix Lender Directory Filtering and Column Visibility

## Problems
1. **Filter button does nothing** - It's a placeholder with no click handler or filter logic
2. **Column visibility shows wrong columns** - The hide/show modal only lists 8 basic columns, but lenders have 40+ product fields, 12+ LTV fields, and many number fields that should all be available

## Solution Overview

Implement full filtering and column visibility for the Approved Lenders page, matching the pattern used in Active.tsx and other pipeline pages.

---

## Technical Changes

### File: `src/pages/contacts/ApprovedLenders.tsx`

#### A) Add Filter State and Logic

1. **Import** the ButtonFilterBuilder and filter utilities:
   ```typescript
   import { ButtonFilterBuilder, FilterCondition } from "@/components/ui/button-filter-builder";
   import { countActiveFilters, applyAdvancedFilters } from "@/utils/filterUtils";
   ```

2. **Add state** for filters:
   ```typescript
   const [filters, setFilters] = useState<FilterCondition[]>([]);
   const [isFilterOpen, setIsFilterOpen] = useState(false);
   ```

3. **Create filterColumns** array with all lender fields:
   - Text fields: lender_name, account_executive, account_executive_email, epo_period, notes
   - Select fields: lender_type (Conventional/Non-QM/Private/HELOC), status (Active/Pending), all product fields (Y/N/TBD options)
   - Number fields: min_loan_amount, max_loan_amount, min_fico, all LTV percentages
   - Date fields: initial_approval_date, renewed_on

4. **Apply filters** to the lender data using `applyAdvancedFilters()`

5. **Wire up the Filter button** to toggle `isFilterOpen`

6. **Render the ButtonFilterBuilder** when isFilterOpen is true

#### B) Expand Column Definitions

Replace the limited `initialColumns` with a comprehensive list of all lender fields:

```typescript
const initialColumns = [
  { id: "rowNumber", label: "#", visible: true },
  { id: "lender_name", label: "Lender Name", visible: true },
  { id: "lender_type", label: "Lender Type", visible: true },
  { id: "account_executive", label: "Account Executive", visible: true },
  { id: "ae_email", label: "AE Email", visible: true },
  { id: "ae_phone", label: "AE Phone", visible: true },
  { id: "broker_portal_url", label: "Broker Portal", visible: true },
  { id: "send_email", label: "Send Email", visible: true },
  // Loan Limits & Dates
  { id: "min_loan_amount", label: "Min Loan", visible: false },
  { id: "max_loan_amount", label: "Max Loan", visible: false },
  { id: "initial_approval_date", label: "Initial Approval", visible: false },
  { id: "renewed_on", label: "Renewed On", visible: false },
  // Products (all ~35 product fields)
  { id: "product_fha", label: "FHA", visible: false },
  { id: "product_va", label: "VA", visible: false },
  { id: "product_conv", label: "Conventional", visible: false },
  { id: "product_jumbo", label: "Jumbo", visible: false },
  { id: "product_bs_loan", label: "Bank Statement", visible: false },
  { id: "product_wvoe", label: "WVOE", visible: false },
  { id: "product_1099_program", label: "1099 Program", visible: false },
  { id: "product_pl_program", label: "P&L Program", visible: false },
  { id: "product_itin", label: "ITIN", visible: false },
  { id: "product_dpa", label: "DPA", visible: false },
  { id: "product_heloc", label: "HELOC", visible: false },
  { id: "product_inv_heloc", label: "Inv HELOC", visible: false },
  { id: "product_fn_heloc", label: "FN HELOC", visible: false },
  { id: "product_nonqm_heloc", label: "Non-QM HELOC", visible: false },
  { id: "product_manufactured_homes", label: "Manufactured", visible: false },
  { id: "product_coop", label: "Co-Op", visible: false },
  { id: "product_condo_hotel", label: "Condo Hotel", visible: false },
  { id: "product_high_dti", label: "High DTI", visible: false },
  { id: "product_low_fico", label: "Low FICO", visible: false },
  { id: "product_no_credit", label: "No Credit", visible: false },
  { id: "product_dr_loan", label: "DR Loan", visible: false },
  { id: "product_fn", label: "Foreign National", visible: false },
  { id: "product_nwc", label: "NWC", visible: false },
  { id: "product_5_8_unit", label: "5-8 Unit", visible: false },
  { id: "product_9_plus_unit", label: "9+ Units", visible: false },
  { id: "product_commercial", label: "Commercial", visible: false },
  { id: "product_construction", label: "Construction", visible: false },
  { id: "product_land_loan", label: "Land Loan", visible: false },
  { id: "product_fthb_dscr", label: "FTHB DSCR", visible: false },
  { id: "product_no_income_primary", label: "No Inc Primary", visible: false },
  { id: "product_no_seasoning_cor", label: "No Season C/O", visible: false },
  { id: "product_tbd_uw", label: "TBD UW", visible: false },
  { id: "product_condo_review_desk", label: "Condo Review", visible: false },
  { id: "product_condo_mip_issues", label: "Condo MIP", visible: false },
  { id: "product_558", label: "558", visible: false },
  { id: "product_wvoe_family", label: "WVOE Family", visible: false },
  { id: "product_1099_less_1yr", label: "1099 <1yr", visible: false },
  { id: "product_1099_no_biz", label: "1099 No Biz", visible: false },
  { id: "product_omit_student_loans", label: "Omit Student", visible: false },
  { id: "product_no_ratio_dscr", label: "No Ratio DSCR", visible: false },
  // LTVs
  { id: "max_ltv", label: "Max LTV", visible: false },
  { id: "conv_max_ltv", label: "Conv Max LTV", visible: false },
  { id: "fha_max_ltv", label: "FHA Max LTV", visible: false },
  { id: "jumbo_max_ltv", label: "Jumbo Max LTV", visible: false },
  { id: "bs_loan_max_ltv", label: "BS Loan Max LTV", visible: false },
  { id: "wvoe_max_ltv", label: "WVOE Max LTV", visible: false },
  { id: "dscr_max_ltv", label: "DSCR Max LTV", visible: false },
  { id: "ltv_1099", label: "1099 Max LTV", visible: false },
  { id: "pl_max_ltv", label: "P&L Max LTV", visible: false },
  { id: "fn_max_ltv", label: "FN Max LTV", visible: false },
  { id: "heloc_max_ltv", label: "HELOC Max LTV", visible: false },
  { id: "condo_inv_max_ltv", label: "Condo Inv Max LTV", visible: false },
  // Numbers
  { id: "min_fico", label: "Min FICO", visible: false },
  { id: "min_sqft", label: "Min Sqft", visible: false },
  { id: "condotel_min_sqft", label: "Condotel Min Sqft", visible: false },
  { id: "asset_dep_months", label: "Asset Dep (Mo)", visible: false },
  { id: "heloc_min_fico", label: "HELOC Min FICO", visible: false },
  { id: "heloc_min", label: "HELOC Min", visible: false },
  { id: "max_cash_out_70_ltv", label: "Max C/O >70% LTV", visible: false },
  // Other
  { id: "epo_period", label: "EPO Period", visible: false },
  { id: "notes", label: "Notes", visible: false },
];
```

#### C) Build Dynamic Columns

Create a function that generates table columns based on column visibility, similar to Active.tsx:

- Product columns render as Y/N/TBD badges with color coding
- LTV columns show percentage values
- Number columns show formatted numbers
- Currency columns show formatted currency
- Date columns show formatted dates

#### D) Update Lender Interface

Expand the `Lender` interface to include all the fields that are in LenderDetailDialog (lines 38-126 of that file).

---

## Filter Columns Configuration

```typescript
const filterColumns = [
  { value: 'lender_name', label: 'Lender Name', type: 'text' as const },
  { value: 'lender_type', label: 'Lender Type', type: 'select' as const, options: ['Conventional', 'Non-QM', 'Private', 'HELOC'] },
  { value: 'status', label: 'Status', type: 'select' as const, options: ['Active', 'Pending', 'Inactive'] },
  { value: 'account_executive', label: 'Account Executive', type: 'text' as const },
  // Products - all as select with Y/N/TBD options
  { value: 'product_fha', label: 'FHA', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  { value: 'product_va', label: 'VA', type: 'select' as const, options: ['Y', 'N', 'TBD'] },
  // ... all other products ...
  // Numbers
  { value: 'min_loan_amount', label: 'Min Loan Amount', type: 'number' as const },
  { value: 'max_loan_amount', label: 'Max Loan Amount', type: 'number' as const },
  { value: 'min_fico', label: 'Min FICO', type: 'number' as const },
  // LTVs
  { value: 'max_ltv', label: 'Max LTV', type: 'number' as const },
  // ... all other LTVs ...
  // Dates
  { value: 'initial_approval_date', label: 'Initial Approval', type: 'date' as const },
  { value: 'renewed_on', label: 'Renewed On', type: 'date' as const },
];
```

---

## UI Changes

1. **Filter button** - Add click handler and active filter count badge
2. **Filter panel** - Show ButtonFilterBuilder below the header when isFilterOpen is true
3. **Column visibility** - The existing ColumnVisibilityButton will automatically show all 70+ columns once initialColumns is updated

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/contacts/ApprovedLenders.tsx` | Add filter state, expand Lender interface, expand initialColumns, add filterColumns, build dynamic columns, wire up filter button, render ButtonFilterBuilder |

---

## Result

After implementation:
- **Filter button** opens a filter builder panel with all lender fields
- **Hide/Show button** shows all 70+ lender columns (products, LTVs, numbers, dates)
- Can filter lenders by any field (e.g., show only lenders where FHA = Y)
- Can toggle visibility of product columns to quickly see which lenders offer specific products
- Filter and column settings persist to localStorage

