
Goal: Fix “Approve” (green checkmark) for Lender Marketing Update suggestions that currently won’t apply (e.g., Max LTV 101.5%, Max Loan Amount $5,000,000, Product DSCR = Y), while “Deny” (X) works.

What’s actually happening (root causes found in code/schema)
1) Type mismatch on numeric columns
- In `lenders` table, several fields are numeric/integer:
  - `max_ltv`, `dscr_max_ltv`, `bs_loan_max_ltv`, `max_loan_amount`, `min_loan_amount` are `numeric`
  - `min_fico` is `integer`
- But suggestions often contain formatted strings like:
  - `"101.5%"` (percent sign)
  - `"$5,000,000"` (currency symbols/commas)
- Current approval code (in `src/hooks/useLenderMarketingSuggestions.tsx`) writes `suggested_value` directly into those numeric columns, which causes Postgres/PostgREST errors (invalid input syntax). The UI doesn’t “accept” because the update fails and the suggestion remains pending.

2) “Product DSCR” field name mismatch for NEW lender suggestions
- Your DB column for DSCR offering is `product_fthb_dscr` (per schema), not `product_dscr`.
- The edge function already maps DSCR correctly for existing lenders, but “new lender” suggestions can still produce field_names like `product_dscr` (or other extracted-key names).
- Current approval code tries to update/insert using `[suggestion.field_name]` directly, which fails if that column doesn’t exist.

Plan (implementation steps)
A) Improve approve logic to normalize values before updating lenders
File: `src/hooks/useLenderMarketingSuggestions.tsx`

1) Add a small “field alias” map for known extracted keys that don’t match actual `lenders` columns:
- Example aliases:
  - `product_dscr` → `product_fthb_dscr`
  - `product_bank_statement` → `product_bs_loan`
  - `product_p_l` → `product_pl_program`
  - `product_1099` → `product_1099_program`
  - `product_foreign_national` → `product_fn`
  - (any other known ones mirroring the edge function’s corrected mapping)

2) Add a value coercion helper that converts formatted strings into the correct DB-friendly values:
- For percent-like fields (field contains `ltv`): `"101.5%"` → `101.5` (number)
- For currency-like fields (field contains `loan_amount`, `heloc_min`, etc.): `"$5,000,000"` → `5000000` (number)
- For integer-like fields (`min_fico`, `heloc_min_fico`, etc.): `"620"` → `620` (number)
- Otherwise keep as string (e.g., product flags `'Y'`, clauses, notes, etc.)

3) Change `updateData` typing to allow numbers (not only strings)
- Replace `Record<string, string>` with `Record<string, unknown>` (or `any`) so numeric writes are allowed.

B) Add a robust fallback for “unknown column” cases (optional but recommended)
File: `src/hooks/useLenderMarketingSuggestions.tsx`

If a lender update/insert fails with an error indicating the column doesn’t exist (typical when field_name is not a real column and not in our alias map), then:
1) Fetch current `custom_fields` for that lender
2) Merge `{ [fieldName]: suggestedValue }` into `custom_fields`
3) Update the lender row with the merged `custom_fields`

This makes approvals resilient even if we introduce new dynamic fields later, and aligns with your existing `custom_fields jsonb` strategy.

C) Improve user-visible error feedback
File: `src/hooks/useLenderMarketingSuggestions.tsx`

When an update fails, show the actual `updateError.message` (or a shortened version) in the toast, so it’s obvious whether it failed due to “invalid input syntax for type numeric” vs “column does not exist”.

D) Verification checklist (manual)
1) Open /contacts/lenders → Lender Marketing Updates modal
2) Approve these cases:
   - Existing lender + Max LTV “101.5%” → should save to `lenders.max_ltv` as numeric 101.5 and remove the suggestion row
   - NEW lender + Max Loan Amount “$5,000,000” → should create lender with `max_loan_amount` numeric 5000000 and remove the suggestion
   - NEW lender + Product DSCR “Y” → should write to `product_fthb_dscr = 'Y'` (via alias) and remove the suggestion
3) Confirm in Lender Detail UI that values actually updated (not just removed from pending list).

Notes / why this approach
- This fixes the immediate “checkmark does nothing” behavior without requiring any database migrations.
- It makes approval robust against both formatting issues (%, $) and naming mismatches for product keys.
- It leverages your `custom_fields` JSONB as a safety net for future dynamic fields.

Files expected to change
- `src/hooks/useLenderMarketingSuggestions.tsx` (primary)
(Optional depending on how far we go)
- No other files required unless we want to display more detailed inline error UI in the modal.

Potential edge cases we’ll handle
- Suggested value parses to NaN (e.g., “Up to 101.5%” with extra words): we’ll strip common symbols/commas and parse; if still invalid, we’ll show a toast and keep the suggestion pending.
- New lender + multiple suggestions: each approval should succeed independently, even if the lender is created on the first approval and subsequent approvals need to “find existing lender” (we already do the case-insensitive lookup).

