
# Plan: Fix Lender Marketing Suggestions Not Being Created

## Problem Summary

Emails from Helm Bank USA, Preferred Rate Wholesale, and Valere Financial are:
- ✅ Being detected as lender marketing emails
- ✅ Having AI extraction run and stored in `email_logs.lender_marketing_data`
- ❌ NOT generating suggestions in `lender_field_suggestions` table

## Root Cause

The `parse-lender-marketing-data` edge function successfully extracts lender data via AI, but the suggestions are NOT being inserted into the database. This appears to be because:

1. **Missing domain mappings** - The domains `helmbankusa.com`, `preferredrate.com`, and `valerefinancial.com` are not in `LENDER_DOMAIN_MAPPINGS`
2. **Lender matching fails** - When no match is found, the code tries to create "new lender" suggestions, but these may be silently failing

## Solution

### Part 1: Add Missing Lender Domain Mappings

**File:** `supabase/functions/parse-lender-marketing-data/index.ts`

Add these domains to the `LENDER_DOMAIN_MAPPINGS` constant (around line 104):

```typescript
// New domains to add:
'helmbankusa.com': 'Helm Bank USA',
'notification@helmbankusa.com': 'Helm Bank USA', // Some lenders use subdomain prefixes
'preferredrate.com': 'Preferred Rate Wholesale',
'valerefinancial.com': 'Valere Financial',
'dartbank.com': 'Dart Bank',
```

### Part 2: Improve New Lender Suggestion Logic

The edge function already has logic to create suggestions for new lenders (lines 771-868), but it may be failing silently. We need to add better logging and ensure suggestions are properly created.

Add logging before the insert to confirm the suggestion records:

```typescript
// Around line 907, add logging:
console.log('[parse-lender-marketing-data] Suggestion records to insert:', 
  JSON.stringify(suggestionRecords.map(s => ({ 
    field: s.field_name, 
    value: s.suggested_value,
    is_new: s.is_new_lender,
    lender: s.suggested_lender_name 
  }))));
```

### Part 3: Backfill Recent Emails (Reprocessing)

Since the emails are already in `email_logs` with the marketing flag set and lender names extracted, we can trigger the `reprocess-lender-suggestions` edge function to regenerate suggestions for all recent lender marketing emails.

**Action:** Call the existing `reprocess-lender-suggestions` edge function which:
1. Deletes all pending records in `lender_field_suggestions`
2. Re-processes recent (last 48 hours) lender marketing emails through the AI parsing logic

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/parse-lender-marketing-data/index.ts` | Add 4 new domains to `LENDER_DOMAIN_MAPPINGS` |
| `supabase/functions/parse-lender-marketing-data/index.ts` | Add debug logging for suggestion insertion |
| Edge function call | Invoke `reprocess-lender-suggestions` to backfill |

---

## Expected Result

After these changes:
- Helm Bank USA, Preferred Rate Wholesale, Valere Financial, and Dart Bank will be properly identified
- "Add" and "Reject" buttons will appear in the email popover and in the Approved Lenders red dot modal
- The red notification badge on "Approved Lenders" will show pending suggestions
- Backfill will regenerate suggestions for all recent marketing emails

---

## Technical Notes

- The existing `reprocess-lender-suggestions` function was created specifically for this scenario
- Domain mappings act as a fallback when AI detection fails
- The fix ensures both new incoming emails AND existing emails get proper suggestions
