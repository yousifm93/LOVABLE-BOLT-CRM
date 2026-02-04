

# Fix Email Open and Reply Tracking Issues

## Problems Identified

### Problem 1: Email Opens Not Registering
**Symptom**: You opened all 3 emails but none show "Opened: Yes"

**Root Cause**: The logs show `Skipping lender ... open update - email is older than last sent`. The comparison between `emailLog.created_at` and `lender.last_email_sent_at` is failing due to slight timing differences - both are set at nearly the same time when sending, but millisecond differences cause the check to fail.

**Fix**: Compare with a small tolerance (e.g., 5 seconds) OR store the `email_log_id` in `custom_args` and match by that instead of timestamp.

---

### Problem 2: All 3 Lenders Marked as Replied (but only 1 replied)
**Symptom**: You replied to 1 email, but all 3 lenders show "Replied: Yes"

**Root Cause**: The logs reveal:
```text
Updated ACRA - reply detected from mbborrower@gmail.com
Updated ADVANCIAL - reply detected from mbborrower@gmail.com  
Updated BAC - reply detected from mbborrower@gmail.com
```

All 3 lenders have Account Executive emails at the same domain (`gmail.com`). Since domain matching is used, a single reply from `mbborrower@gmail.com` matches all lenders with `@gmail.com` AE emails.

**Fix**: For common public email domains (gmail.com, yahoo.com, outlook.com, hotmail.com, etc.), use **exact email match** instead of domain match. Only use domain matching for corporate domains.

---

### Problem 3: Reply Status Not Resetting When New Email Sent
**Symptom**: 11 lenders still showed "Replied: Yes" after sending new emails

**Root Cause**: The `send-direct-email` function only resets `last_email_opened` and `last_email_replied` to `false`, but doesn't reset the `_at` timestamp columns to `null`. Also, lenders who weren't in the new batch (the other 8) weren't updated at all.

**Fix**: Reset both boolean AND timestamp columns. Also ensure the logic correctly identifies that only lenders who received the NEW email should be evaluated.

---

## Technical Changes

### File 1: `supabase/functions/email-webhooks/index.ts`

**Fix Open Detection Timing Issue**

Change the timestamp comparison to allow a 5-second tolerance window:

```typescript
// Current problematic code:
if (emailSentAt >= lastSentAt) { ... }

// Fixed code - allow 5-second tolerance:
const toleranceMs = 5000; // 5 seconds
if (emailSentAt >= lastSentAt - toleranceMs) { ... }
```

This accounts for the small time difference between when `email_logs.created_at` and `lenders.last_email_sent_at` are set.

---

### File 2: `supabase/functions/sync-lender-email-replies/index.ts`

**Fix Domain Matching for Public Domains**

Add a list of public email domains that require exact email matching:

```typescript
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
  'aol.com', 'icloud.com', 'protonmail.com', 'live.com',
  'msn.com', 'me.com', 'mail.com', 'ymail.com'
]);

// For each lender:
const aeDomain = lender.account_executive_email.split("@")[1]?.toLowerCase();
const aeEmail = lender.account_executive_email.toLowerCase();

let matched = false;

if (PUBLIC_DOMAINS.has(aeDomain)) {
  // Exact email match required for public domains
  matched = emailsFromDomain.some(email => 
    email.fromEmail.toLowerCase() === aeEmail && 
    new Date(email.rawDate).getTime() > lastSentAt
  );
} else {
  // Domain match for corporate domains
  matched = emailsFromDomain.some(email => 
    new Date(email.rawDate).getTime() > lastSentAt
  );
}
```

Also build an email-level map in addition to domain-level map for exact matching.

---

### File 3: `supabase/functions/send-direct-email/index.ts`

**Reset All Tracking Fields When Sending New Email**

Update the lender update to also clear the timestamp columns:

```typescript
const { error: updateError } = await supabase.from('lenders').update({
  last_email_sent_at: new Date().toISOString(),
  last_email_subject: subject,
  last_email_opened: false,
  last_email_opened_at: null,     // ADD THIS
  last_email_replied: false,
  last_email_replied_at: null,    // ADD THIS
}).eq('id', lender_id);
```

---

## Summary of Changes

| File | Change | Fixes |
|------|--------|-------|
| `email-webhooks/index.ts` | Add 5-second tolerance to timestamp comparison | Opens not registering |
| `sync-lender-email-replies/index.ts` | Use exact email match for public domains (gmail, etc.) | All 3 marked as replied when only 1 replied |
| `send-direct-email/index.ts` | Reset `_at` timestamp columns to null | Reply status not resetting |

---

## Expected Behavior After Fix

1. **Send emails to 3 lenders** → All 3 have:
   - `last_email_opened = false`, `last_email_opened_at = null`
   - `last_email_replied = false`, `last_email_replied_at = null`

2. **Open 2 of the 3 emails** → Only those 2 show:
   - `last_email_opened = true` (within 5-second tolerance window)

3. **Reply to 1 email from gmail lender** → Only that 1 lender shows:
   - `last_email_replied = true`
   - Other gmail lenders remain `false` (exact email match used)

