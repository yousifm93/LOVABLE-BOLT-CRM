
# Plan: Fix Missing Email Signature for Yousif

## Root Cause

The email signature is stored on the wrong user account. You have 3 Yousif accounts in the `users` table:

| Email | Has Signature | Account ID |
|-------|---------------|------------|
| `yousif@mortgagebolt.com` | ❌ NULL | `b06a12ea...` |
| `yousifminc@gmail.com` | ❌ NULL | `08e73d69...` |
| `yousif@mortgagebolt.org` | ✅ HAS SIGNATURE | `230ccf6d...` |

When you log in, the CRM matches your auth session to a `users` record via `auth_user_id`. If you're logging in with `yousif@mortgagebolt.com` or `yousifminc@gmail.com`, those accounts have NULL signatures.

---

## Solution: Copy Signature to Active Account(s)

This is a **database fix** - no code changes needed. The signature HTML exists and just needs to be copied to the correct user record(s).

### SQL to Run (in Supabase SQL Editor)

```sql
-- Copy Yousif's signature from the .org account to the other Yousif accounts
UPDATE users 
SET email_signature = (
  SELECT email_signature 
  FROM users 
  WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
)
WHERE id IN (
  'b06a12ea-00b9-4725-b368-e8a416d4028d',  -- yousif@mortgagebolt.com
  '08e73d69-4707-4773-84a4-69ce2acd6a11'   -- yousifminc@gmail.com
);
```

---

## Alternative: Use Single Account

If you prefer, you could consolidate to a single account by updating the `auth_user_id` on the account that has the signature. But the simpler fix is to just copy the signature.

---

## Verification

After running the SQL, you can verify:
```sql
SELECT id, email, 
  CASE WHEN email_signature IS NULL THEN 'NULL' 
       ELSE 'HAS SIGNATURE' END as sig_status
FROM users 
WHERE first_name = 'Yousif';
```

All Yousif accounts should show "HAS SIGNATURE".

---

## No Code Changes Required

The `BulkLenderEmailModal.tsx` code is already correct:
- It fetches `email_signature` from the logged-in user's record (line 62-68)
- It appends the signature to emails when available (line 157-159)

The issue is purely a data problem - the signature data exists but is on a different user record than the one you're logging in with.
