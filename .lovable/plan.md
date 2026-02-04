

# Fix Email Reply Detection via IMAP Domain Matching

## Problem
The current `sync-lender-email-replies` function looks for inbound emails in `email_logs`, but inbound emails fetched via IMAP are never persisted there. This is why "Email Replied" always shows "No".

## Solution
Modify `sync-lender-email-replies` to fetch emails directly from the Scenarios inbox via IMAP, then match sender email domains to lenders.

### Matching Logic
Each lender has a unique email domain through their Account Executive email:
- Angel Oak AE email: `john@angeloakms.com` → domain: `angeloakms.com`  
- Advancial AE email: `sarah@advancial.org` → domain: `advancial.org`

When an email arrives FROM `jane@angeloakms.com` → it's a reply from Angel Oak.

This works because:
- Different lenders have different email domains
- Even if multiple people at the same lender reply, they share the same domain
- Subject line is irrelevant - we match by WHO sent the email

---

## Technical Changes

### File: `supabase/functions/sync-lender-email-replies/index.ts`

**Current flow:**
1. Get all lenders with AE emails
2. For each lender, query `email_logs` for inbound emails from their domain
3. Update lender if found

**New flow:**
1. Fetch last 100 emails from Scenarios inbox via internal call to `fetch-emails-imap`
2. Build a map of sender domains → email details
3. Get all lenders with AE emails
4. For each lender, check if their AE domain appears in the emails map
5. If found, update `lenders.last_email_replied = true` and `last_email_replied_at`

### Key Code Changes

```typescript
// 1. Fetch emails from Scenarios inbox via internal Supabase function call
const imapResponse = await fetch(
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-emails-imap`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account: "scenarios",
      folder: "INBOX",
      limit: 100,
    }),
  }
);

const imapData = await imapResponse.json();
const emails = imapData.emails || [];

// 2. Build domain-to-email map
const domainEmailMap = new Map<string, { date: string; fromEmail: string }>();
for (const email of emails) {
  if (!email.fromEmail) continue;
  const domain = email.fromEmail.split("@")[1]?.toLowerCase();
  if (domain && !domain.includes("mortgagebolt")) {
    // Keep the most recent email per domain
    if (!domainEmailMap.has(domain)) {
      domainEmailMap.set(domain, { date: email.date, fromEmail: email.fromEmail });
    }
  }
}

// 3. For each lender, check if their domain has replied
for (const lender of lenders) {
  const aeDomain = lender.account_executive_email.split("@")[1]?.toLowerCase();
  if (aeDomain && domainEmailMap.has(aeDomain)) {
    // Update lender as having replied
    await supabase.from("lenders").update({
      last_email_replied: true,
      last_email_replied_at: new Date().toISOString(), // Or parse email date
    }).eq("id", lender.id);
  }
}
```

---

## UI Integration

### Add "Check Replies" Button to Approved Lenders

**File: `src/pages/contacts/ApprovedLenders.tsx`**

Add a button next to Refresh that calls the `sync-lender-email-replies` function:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleCheckReplies}
  disabled={isCheckingReplies}
>
  {isCheckingReplies ? (
    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <Mail className="h-4 w-4 mr-2" />
  )}
  Check Replies
</Button>
```

When clicked:
1. Calls `sync-lender-email-replies` edge function
2. Shows loading state
3. On completion, refreshes lender data
4. Shows toast with count of newly detected replies

---

## Files to Modify

1. **`supabase/functions/sync-lender-email-replies/index.ts`**
   - Remove `email_logs` query approach
   - Add internal call to `fetch-emails-imap` for scenarios inbox
   - Match sender domains to lender AE domains
   - Update lenders that have replies

2. **`src/pages/contacts/ApprovedLenders.tsx`**
   - Add `isCheckingReplies` state
   - Add `handleCheckReplies` function
   - Add "Check Replies" button to toolbar

---

## Expected Behavior After Implementation

1. User clicks "Check Replies" button
2. System fetches last 100 emails from Scenarios inbox
3. For each email, extracts sender domain (e.g., `angeloakms.com`)
4. Matches domains to lenders' AE email domains
5. Updates matching lenders with `last_email_replied = true`
6. Table refreshes and shows "Yes" for lenders who replied
7. Toast shows "Found 3 new replies" (or similar)

---

## Edge Cases Handled

- **Multiple replies from same lender**: Uses most recent email
- **Different people at same company replying**: All share same domain, so still matched
- **Forwarded emails**: IMAP function already extracts original sender
- **Auto-replies/out-of-office**: Will be detected (acceptable - shows engagement)
- **mortgagebolt.org emails**: Explicitly excluded from matching

