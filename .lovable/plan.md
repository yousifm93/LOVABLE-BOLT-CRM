

# Plan: Fix Lender Marketing Update System ✅ COMPLETED

## Implementation Complete

All four fixes have been deployed to `supabase/functions/parse-lender-marketing-data/index.ts`:

### ✅ Bug 1: Fixed Database Column Names
Changed field mappings to use correct lenders table columns:
- `product_dscr` → `product_fthb_dscr`
- `product_foreign_national` → `product_fn`
- `product_conventional` → `product_conv`
- `product_bank_statement` → `product_bs_loan`
- `product_p_l` → `product_pl_program`
- `product_1099` → `product_1099_program`
- `product_non_warrantable_condo` → `product_nwc`
- Added `product_heloc` mapping

### ✅ Bug 2: Added Missing Domain Mappings
Added 25+ new domain mappings including:
- `forwardlendingmtg.com` → Forward Lending
- `admortgage.com` → A&D Mortgage
- `kindlending.com` → Kind Lending
- `epmmortgage.com` → EPM
- And more...

### ✅ Bug 3: Exclude Unknown Lender Suggestions
Added early return guard that skips creating any suggestions when lender cannot be identified.

### ✅ Bug 4: Propagate Lender Name to All Suggestions
Fixed suggestion records to set `is_new_lender` and `suggested_lender_name` for ALL suggestions when no matching lender exists (not just the `new_lender` entry).

---

## Post-Deployment Action Required

**Manual step:** Clear current pending suggestions in Supabase SQL Editor:
```sql
DELETE FROM lender_field_suggestions WHERE status = 'pending' AND created_at > NOW() - INTERVAL '48 hours';
```

Then trigger reprocessing of recent lender marketing emails to generate correct suggestions.

