

# Plan: Enable Column Sorting in Lender Directory + Add Scenarios Inbox

## Overview
Two requests:
1. **Enable column sorting** in the Lender Directory by clicking column headers
2. **Add a "Scenarios Inbox"** section to the Email page to view emails from scenarios@mortgagebolt.org

---

## Part 1: Enable Column Sorting in Lender Directory

### Current State
- The DataTable component already supports sorting via the `sortable: true` property on column definitions
- When a column is marked `sortable: true`, clicking the header toggles ascending/descending sort
- Only a few columns (`lender_name`, `lender_type`, `account_executive`) currently have `sortable: true`
- All other columns (products, LTVs, numbers, dates) are missing this property

### Solution
**File: `src/pages/contacts/ApprovedLenders.tsx`**

Add `sortable: true` to all column definitions in the `columns` useMemo block:

1. **Text columns** (already have it): lender_name, lender_type, account_executive
2. **Loan limit columns**: min_loan_amount, max_loan_amount
3. **Date columns**: initial_approval_date, renewed_on
4. **Product columns** (Y/N/TBD): All ~35 product fields
5. **LTV columns**: All ~12 LTV percentage fields
6. **Number columns**: min_fico, min_sqft, condotel_min_sqft, asset_dep_months, etc.
7. **Other**: epo_period, notes

The DataTable handles sorting logic automatically - numeric, date, and string comparison are all built-in. Once `sortable: true` is added, users can click any column header to sort by that column.

---

## Part 2: Add Scenarios Inbox to Email Page

### Current State
- The Email page currently connects to `yousif@mortgagebolt.org` via IMAP (IONOS)
- The `scenarios@mortgagebolt.org` email is used for outgoing lender emails
- The edge function `fetch-emails-imap/index.ts` is hardcoded to `yousif@mortgagebolt.org`
- There's an `IONOS_EMAIL_PASSWORD` secret configured

### Requirements for Scenarios Inbox
To view emails from scenarios@mortgagebolt.org, we need:

1. **A separate password** for the scenarios@mortgagebolt.org IONOS mailbox
   - This will need to be stored as a new secret (e.g., `SCENARIOS_EMAIL_PASSWORD`)
   
2. **An updated edge function** that can accept which account to fetch from
   - Add an `account` parameter to `fetch-emails-imap`
   - Use different credentials based on the account parameter

3. **UI changes** to the Email page sidebar
   - Add a new section below Categories called "ACCOUNTS" or similar
   - Include a "Scenarios Inbox" item that switches to fetching from scenarios@mortgagebolt.org

### Technical Implementation

**A) Add new secret**
- Need user to provide the password for scenarios@mortgagebolt.org IONOS account
- Store as `SCENARIOS_EMAIL_PASSWORD` in Supabase secrets

**B) Update Edge Function: `supabase/functions/fetch-emails-imap/index.ts`**
```typescript
// Add account parameter
interface FetchEmailsRequest {
  account?: 'yousif' | 'scenarios';  // NEW
  folder?: string;
  // ... existing params
}

// Map account to credentials
const ACCOUNTS = {
  yousif: {
    user: 'yousif@mortgagebolt.org',
    password: Deno.env.get('IONOS_EMAIL_PASSWORD'),
  },
  scenarios: {
    user: 'scenarios@mortgagebolt.org',
    password: Deno.env.get('SCENARIOS_EMAIL_PASSWORD'),
  },
};
```

**C) Update Email.tsx**
1. Add `selectedAccount` state (`'yousif' | 'scenarios'`)
2. Pass `account` parameter to edge function calls
3. Add "ACCOUNTS" section to sidebar with:
   - Main Inbox (yousif@mortgagebolt.org) - current default
   - Scenarios Inbox (scenarios@mortgagebolt.org)
4. Style like existing folder buttons

### UI Mockup
```text
┌─────────────────────────┐
│ Inbox                   │
│ Starred                 │
│ Sent                    │
│ Archive                 │
│ Trash                   │
├─────────────────────────┤
│ CATEGORIES         [+]  │
│ ◎ Needs Attention    3  │
│ ✓ File               2  │
│ ✓ Lender Mktg           │
│ ✓ Reviewed - N/A    18  │
├─────────────────────────┤
│ ACCOUNTS                │
│ ✉ Yousif Inbox          │  ← current
│ ✉ Scenarios Inbox       │  ← new
└─────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/contacts/ApprovedLenders.tsx` | Add `sortable: true` to all column definitions |
| `supabase/functions/fetch-emails-imap/index.ts` | Add `account` parameter, support multiple mailboxes |
| `src/pages/Email.tsx` | Add account selector in sidebar, pass account to edge function |

---

## What You Need to Provide

For the Scenarios Inbox to work, I need:

1. **The IONOS password for scenarios@mortgagebolt.org**
   - This should be added as a secret called `SCENARIOS_EMAIL_PASSWORD`
   - Is this the same password as yousif@mortgagebolt.org, or a different one?

2. **Confirmation of IONOS account setup**
   - Is scenarios@mortgagebolt.org configured as a separate mailbox in IONOS?
   - Or is it an alias/forwarding address?

If it's a separate mailbox with its own password, I can proceed with the implementation. If it's an alias or uses the same credentials, the approach might be simpler.

---

## Summary

1. **Column Sorting** - Quick fix: add `sortable: true` to all column definitions in ApprovedLenders.tsx
2. **Scenarios Inbox** - Requires:
   - New secret for scenarios email password
   - Edge function update to support multiple accounts
   - UI update with account switcher in sidebar

