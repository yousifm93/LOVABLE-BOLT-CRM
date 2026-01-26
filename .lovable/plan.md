
## Fix: Auto-Parse Contacts from Inbound Emails

### Problem Summary

The contact auto-add feature stopped working because the `inbound-email-webhook` edge function is NOT calling `parse-email-contacts` when emails arrive. Contacts are only parsed when manually selecting an email in the "New Contacts" view, which defeats the purpose of automatic detection.

---

### Solution

Add a call to `parse-email-contacts` in the `inbound-email-webhook` function, similar to how other parsing functions are already called (like `parse-email-field-updates` and `parse-email-lender-marketing`).

---

### Implementation Details

**File to modify:** `supabase/functions/inbound-email-webhook/index.ts`

**Where to add:** After the email log is created (around line 596-600), add a call to `parse-email-contacts` alongside the existing parsing calls.

**Code to add:**
```typescript
// Parse email for contact extraction (auto-add contacts)
try {
  console.log('[Inbound Email Webhook] Triggering contact parsing...');
  
  const contactParseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email-contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      emailLogId: emailLog.id,
      emailContent: {
        from: senderName,
        fromEmail: fromEmailToStore,
        subject: subject,
        body: textBody || htmlBody,
        date: new Date().toISOString()
      }
    }),
  });

  if (contactParseResponse.ok) {
    const contactData = await contactParseResponse.json();
    if (contactData.count > 0) {
      console.log('[Inbound Email Webhook] Extracted', contactData.count, 'new contacts');
    }
  } else {
    console.log('[Inbound Email Webhook] Contact parsing failed:', await contactParseResponse.text());
  }
} catch (contactError) {
  console.error('[Inbound Email Webhook] Error parsing contacts:', contactError);
  // Don't fail the webhook if contact parsing fails
}
```

---

### Where in the Code Flow

The call should be added in two places:

1. **For lender marketing emails** (around line 495-520) - These often contain account executive contact info in signatures
2. **For lead-matched emails** (after line 817, alongside the other parsing calls) - To extract contacts from regular emails

---

### Expected Behavior After Fix

1. Every inbound email will be automatically scanned for contacts
2. New contacts will appear in "Pending Approval" section of Master Contact List
3. The "New Contacts" view in Email tab will show emails with pending contact suggestions
4. The sidebar badge for "Master Contact List" will update with pending approval count

---

### Technical Notes

- The `parse-email-contacts` function already handles:
  - Duplicate detection (checks `contacts`, `buyer_agents`, `lenders`, and `leads` tables)
  - Company extraction from email domains
  - Tag suggestions based on domain
  - Inserts directly to `contacts` table with `approval_status: 'pending'`
  - Creates audit trail in `email_contact_suggestions` table

- No changes needed to the `parse-email-contacts` function itself - it's already complete

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/inbound-email-webhook/index.ts` | Add call to `parse-email-contacts` after email log creation |
