

# Fix Email-Specific Open and Reply Tracking

## Root Cause Analysis

### Problem 1: Email Opened Shows 3 Instead of 2
The `email-webhooks` function updates `lenders.last_email_opened` whenever ANY open event is received for that lender - even if it's from a previously sent email. So when you sent 3 new emails, previous opens on older emails still update the lender-level flag.

### Problem 2: Replied Shows 11 Instead of 1
The `sync-lender-email-replies` function matches ANY email from the lender's domain (e.g., `@angeloakms.com`) in the Scenarios inbox. If there are 11 emails from lenders in that inbox (from any time), it marks all 11 lenders as "replied".

---

## Solution: Track Opens and Replies Per-Email, Not Per-Lender

The lender-level columns (`last_email_opened`, `last_email_replied`) should ONLY reflect the status of the **most recently sent email** to that lender, not any email ever sent.

### Change 1: Only Update Lender Open Status for the LATEST Sent Email

**File: `supabase/functions/email-webhooks/index.ts`**

When an open event is received:
1. Match it to a specific `email_logs` record (already working)
2. Before updating `lenders.last_email_opened`, check if this email is the most recent one sent to that lender
3. Only update the lender flag if `email_logs.created_at >= lenders.last_email_sent_at`

```text
Current flow:
  Open event → Find email_log → Update lenders.last_email_opened = true

New flow:
  Open event → Find email_log → 
    → Check if email_log.created_at >= lender.last_email_sent_at
    → If yes, update lenders.last_email_opened = true
    → If no, skip lender update (it's an old email)
```

### Change 2: Only Detect Replies That Are AFTER the Last Sent Email

**File: `supabase/functions/sync-lender-email-replies/index.ts`**

When checking for replies:
1. Get `lenders.last_email_sent_at` for each lender
2. Only count inbox emails that have a date AFTER `last_email_sent_at`
3. Match by domain AND ensure the reply came after the email was sent

```text
Current flow:
  Fetch inbox → Match any email from lender domain → Mark as replied

New flow:
  Fetch inbox → For each lender:
    → Get last_email_sent_at
    → Find inbox email from lender domain where email.date > last_email_sent_at
    → Only then mark as replied
```

---

## Technical Implementation

### File 1: `supabase/functions/email-webhooks/index.ts`

Add a check before updating lender open status (around lines 172-181):

```typescript
// Before updating lenders, verify this email is the most recent one sent
if (lenderId) {
  // Get the lender's last_email_sent_at
  const { data: lender } = await supabase
    .from('lenders')
    .select('last_email_sent_at')
    .eq('id', lenderId)
    .single();
  
  // Only update lender if this email was sent at or after last_email_sent_at
  if (lender && emailLog && emailLog.created_at) {
    const emailSentAt = new Date(emailLog.created_at).getTime();
    const lastSentAt = lender.last_email_sent_at 
      ? new Date(lender.last_email_sent_at).getTime() 
      : 0;
    
    if (emailSentAt >= lastSentAt) {
      await supabase
        .from('lenders')
        .update({ 
          last_email_opened: true, 
          last_email_opened_at: occurredAt 
        })
        .eq('id', lenderId);
    } else {
      console.log(`Skipping lender update - email is older than last sent email`);
    }
  }
}
```

### File 2: `supabase/functions/sync-lender-email-replies/index.ts`

Modify to include `last_email_sent_at` in the lender query and only match replies that came after:

```typescript
// Step 3: Get all lenders with email addresses AND their last_email_sent_at
const { data: lenders, error: lendersError } = await supabase
  .from("lenders")
  .select("id, lender_name, account_executive_email, last_email_replied, last_email_sent_at")
  .not("account_executive_email", "is", null)
  .not("last_email_sent_at", "is", null); // Only check lenders we've emailed

// Step 4: For each lender, check if reply came AFTER we sent our email
for (const lender of lenders || []) {
  const aeDomain = lender.account_executive_email.split("@")[1]?.toLowerCase();
  
  if (aeDomain && domainEmailMap.has(aeDomain)) {
    const emailInfo = domainEmailMap.get(aeDomain)!;
    
    // Parse the reply date from IMAP (need to get raw date from IMAP)
    // For now, we'll need to modify fetch-emails-imap to return rawDate
    // OR use the current approach but reset replied status when sending new emails
  }
}
```

### Change 3: Reset Tracking When Sending New Email

**File: Email sending function (send-direct-email or similar)**

When a new email is sent to a lender, reset the tracking flags:

```typescript
// When sending email, reset the open/reply tracking for fresh tracking
await supabase
  .from('lenders')
  .update({
    last_email_sent_at: new Date().toISOString(),
    last_email_subject: subject,
    last_email_opened: false,        // Reset
    last_email_opened_at: null,      // Reset
    last_email_replied: false,       // Reset
    last_email_replied_at: null,     // Reset
  })
  .eq('id', lenderId);
```

This ensures that after sending a new email:
- `last_email_opened` starts as `false` until THIS email is opened
- `last_email_replied` starts as `false` until a reply to THIS email is detected

---

## Summary of Changes

| File | Change |
|------|--------|
| `email-webhooks/index.ts` | Only update lender open status if email is the most recent sent |
| `sync-lender-email-replies/index.ts` | Only count replies that came after `last_email_sent_at` |
| Email sending logic | Reset `last_email_opened` and `last_email_replied` to false when sending |

---

## Expected Behavior After Fix

1. You send emails to 3 lenders → All 3 have:
   - `last_email_opened = false`
   - `last_email_replied = false`
   
2. You open 2 of the emails → Only those 2 show:
   - `last_email_opened = true`
   - The 3rd remains `false`

3. You reply to 1 email, click "Check Replies" → Only that 1 shows:
   - `last_email_replied = true`
   - The other 2 remain `false`

---

## Files to Modify

1. **`supabase/functions/email-webhooks/index.ts`** - Add date comparison before updating lender
2. **`supabase/functions/sync-lender-email-replies/index.ts`** - Filter replies by date after last sent
3. **Email sending component/function** - Reset open/reply flags when sending new email

