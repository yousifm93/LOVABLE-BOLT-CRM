

# Complete Lender Email Tracking System Fix

## Issues Identified

I found **three critical bugs** preventing email open/reply tracking from working:

### 1. Wrong Column Name in `send-direct-email` (CRITICAL)
The function uses `recipient_email` but the `email_logs` table has `to_email`. This causes the INSERT to fail silently, so no email log is created, breaking the entire tracking chain.

```typescript
// Current (broken):
await supabase.from('email_logs').insert({
  lender_id: lender_id,
  recipient_email: to,  // WRONG - column doesn't exist
  ...
});

// Fixed:
await supabase.from('email_logs').insert({
  lender_id: lender_id,
  to_email: to,  // CORRECT column name
  ...
});
```

### 2. Missing `_at` Columns in UI Display
The "Email Opened" and "Email Replied" columns already include the timestamp data - they show the date/time as a tooltip when you hover over the "Yes/No" badge. The `_at` columns are intentionally combined into the boolean columns for a cleaner UI.

### 3. SendGrid Webhooks May Not Be Configured
Even with the code fix, SendGrid must be configured to send event webhooks (opens, clicks, etc.) to your Supabase edge function URL.

---

## Technical Fixes

### Fix 1: Update `send-direct-email` Edge Function
Change `recipient_email` to `to_email` and also use the correct `direction` enum value.

**Before:**
```typescript
await supabase.from('email_logs').insert({
  lender_id: lender_id,
  recipient_email: to,
  subject: subject,
  body: sanitizedHtml,
  direction: 'Out',
  provider_message_id: providerMessageId,
  delivery_status: 'sent'
});
```

**After:**
```typescript
await supabase.from('email_logs').insert({
  lender_id: lender_id,
  to_email: to,
  from_email: from_email,
  subject: subject,
  html_body: sanitizedHtml,
  direction: 'outbound',
  provider_message_id: providerMessageId,
  delivery_status: 'sent'
});
```

### Fix 2: Add Error Handling
Currently errors in the logging step are swallowed silently. Add explicit error handling so you see if logging fails.

---

## SendGrid Webhook Configuration

For open/click tracking to work, you need to configure SendGrid's Event Webhook:

1. Log into your SendGrid account
2. Go to **Settings > Mail Settings > Event Webhook**
3. Set the HTTP POST URL to: `https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/email-webhooks`
4. Enable these events: Delivered, Opened, Clicked, Bounced, Dropped
5. Enable **Open Tracking** and **Click Tracking** under Settings > Tracking

---

## UI Clarification

The current UI design combines boolean and timestamp into single columns:
- **Email Opened**: Shows "Yes" (green) or "No" (gray) badge
  - Hovering over "Yes" shows: "Opened: Feb 4, 2026 1:02 PM"
- **Email Replied**: Shows "Yes" (blue) or "No" (gray) badge  
  - Hovering over "Yes" shows: "Replied: Feb 4, 2026 1:05 PM"

If you'd prefer separate columns showing the actual timestamp, I can add:
- `last_email_opened_at` as a dedicated column
- `last_email_replied_at` as a dedicated column

---

## Implementation Steps

1. Fix `send-direct-email` function with correct column names
2. Deploy the updated edge function
3. Send a test email to verify it appears in `email_logs`
4. Guide you through SendGrid webhook configuration
5. (Optional) Add separate timestamp columns to the UI

---

## Expected Outcome

After the fix:
1. When you send an email to a lender, it will be logged to `email_logs` with the `lender_id` and `provider_message_id`
2. When SendGrid reports the email was opened, the webhook will match via `provider_message_id` and update `last_email_opened = true` and `last_email_opened_at`
3. The reply sync (hourly cron) will detect incoming emails from lender domains and update `last_email_replied = true` and `last_email_replied_at`

