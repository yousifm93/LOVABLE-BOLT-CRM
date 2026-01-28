

# Plan: Fix Email Account Race Condition

## Problem

When Salma loads the Email page, Yousif's emails briefly appear before being replaced with Salma's emails. This happens because:

1. `selectedAccount` state is initialized to `'yousif'` (line 223)
2. `currentUserConfig` is computed synchronously from `crmUser?.id` when available
3. The fetch effect (lines 803-811) runs and sees `crmUser` is available, but `selectedAccount` is still `'yousif'`
4. The account-setting effect (lines 814-818) runs next, updating `selectedAccount` to `'salma'`
5. This triggers a **second** fetch with the correct account

The issue is that both effects run in the same render cycle when `crmUser` becomes available, but the fetch effect reads the stale `selectedAccount` value.

---

## Solution

Add a guard in the email fetch effect to ensure `selectedAccount` matches the user's expected primary account before fetching. This prevents fetching with an incorrect account.

### File: `src/pages/Email.tsx`

#### Change 1: Add Account Verification Guard to Fetch Effect

Modify lines 803-811 to verify `selectedAccount` matches the expected account before fetching:

```typescript
// BEFORE (current code):
useEffect(() => {
  // Wait for crmUser to load before fetching to ensure correct account
  if (!crmUser) return;
  
  if (!selectedCategory) {
    fetchEmails(selectedFolder, 0, false, selectedAccount);
  }
}, [selectedFolder, selectedCategory, selectedAccount, crmUser]);

// AFTER (with account verification):
useEffect(() => {
  // Wait for crmUser to load before fetching to ensure correct account
  if (!crmUser) return;
  
  // Don't fetch until selectedAccount matches user's expected primary account
  // This prevents the race condition where selectedAccount is still 'yousif' 
  // before the account-setting effect has run
  const expectedPrimary = currentUserConfig?.primary;
  if (expectedPrimary && selectedAccount !== expectedPrimary && selectedAccount !== 'scenarios') {
    return; // Wait for account-setting effect to update selectedAccount
  }
  
  if (!selectedCategory) {
    fetchEmails(selectedFolder, 0, false, selectedAccount);
  }
}, [selectedFolder, selectedCategory, selectedAccount, crmUser, currentUserConfig?.primary]);
```

This logic:
- If user config exists (Salma has `primary: 'salma'`)
- And `selectedAccount` is not the expected primary (still `'yousif'`)
- And `selectedAccount` is not `'scenarios'` (which is always allowed)
- Then skip the fetch and wait for the account-setting effect to run

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| `src/pages/Email.tsx` | Lines 803-811 | Add guard to prevent fetch when `selectedAccount` doesn't match user's primary |

---

## Why This Works

1. When Salma logs in:
   - `crmUser` becomes available with Salma's ID
   - `currentUserConfig` computes to `{ primary: 'salma', label: 'Salma Inbox' }`
   - The fetch effect runs but sees `selectedAccount='yousif'` !== `expectedPrimary='salma'`
   - The guard prevents the fetch
   - The account-setting effect runs and sets `selectedAccount='salma'`
   - The fetch effect runs again with `selectedAccount='salma'` === `expectedPrimary='salma'`
   - Now the fetch proceeds with the correct account

2. When switching to Scenarios Inbox:
   - User clicks Scenarios Inbox
   - `selectedAccount` changes to `'scenarios'`
   - The guard allows this because `selectedAccount === 'scenarios'` is always permitted

---

## Expected Result

- Salma sees only her emails on initial load (no flash of Yousif's emails)
- Herman sees only his emails on initial load
- Yousif sees only his emails on initial load
- Switching between accounts (e.g., Salma Inbox ↔ Scenarios Inbox) continues to work normally

