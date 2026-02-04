

## Fix: Sync Lender Email Replies - Invalid Timestamp Format

### Problem Identified

The `sync-lender-email-replies` function is **finding replies correctly** (10 unique domains matched), but the database updates are **failing** because:

1. `fetch-emails-imap` returns a **display-formatted date** like `"2:02 PM"` or `"Jan 29"` in the `date` field
2. `sync-lender-email-replies` tries to insert this directly into `last_email_replied_at`
3. PostgreSQL rejects it because `"2:02 PM"` is not a valid timestamp

### Error Evidence from Logs
```
invalid input syntax for type timestamp with time zone: "2:02 PM"
invalid input syntax for type timestamp with time zone: "Jan 29"
```

### Solution

Modify `sync-lender-email-replies` to use `new Date().toISOString()` as the timestamp instead of relying on the display date from IMAP. This is acceptable because:

1. We're detecting the reply **now**, so "now" is a reasonable timestamp
2. The exact reply time matters less than knowing **that** they replied
3. The function runs on-demand, so "now" is close to when the reply was detected

Alternatively, we could modify `fetch-emails-imap` to also return a `rawDate` field with the ISO timestamp, but that would require changes to both functions and is more invasive.

---

### Technical Changes

**File: `supabase/functions/sync-lender-email-replies/index.ts`**

Change line 104 from:
```typescript
last_email_replied_at: emailInfo.date,
```

To:
```typescript
last_email_replied_at: new Date().toISOString(),
```

This ensures we always insert a valid ISO timestamp.

---

### Summary

| What | Change |
|------|--------|
| Root cause | IMAP returns display date (`"2:02 PM"`) not ISO date |
| Fix location | `sync-lender-email-replies/index.ts` line 104 |
| Fix approach | Use `new Date().toISOString()` instead of `emailInfo.date` |
| Scope | Single line change in one file |

After this fix, clicking "Check Replies" will correctly update lenders who have replied.

