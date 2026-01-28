
# Plan: Fix Initial Email Fetch Using Wrong Account

## Problem

When Salma (or Herman) loads the Email page, emails from Yousif's inbox are displayed initially because:

1. `selectedAccount` state is initialized to `'yousif'` (hardcoded default on line 223)
2. The `fetchEmails` effect (lines 803-808) runs immediately on mount with this default value
3. The `currentUserConfig` is computed from `crmUser`, which loads asynchronously
4. By the time the "set default account" effect (lines 810-815) runs, the initial fetch has already completed with the wrong account

## Solution

Prevent the email fetch from executing until we know the correct account for the logged-in user.

### File: `src/pages/Email.tsx`

#### 1. Add Guard to Email Fetch Effect

Modify the `fetchEmails` useEffect (lines 803-808) to wait until `crmUser` is loaded before fetching. This ensures we fetch from the correct account:

```typescript
// BEFORE (current code):
useEffect(() => {
  if (!selectedCategory) {
    fetchEmails(selectedFolder, 0, false, selectedAccount);
  }
}, [selectedFolder, selectedCategory, selectedAccount]);

// AFTER (with guard):
useEffect(() => {
  // Wait for crmUser to load before fetching to ensure correct account
  if (!crmUser) return;
  
  if (!selectedCategory) {
    fetchEmails(selectedFolder, 0, false, selectedAccount);
  }
}, [selectedFolder, selectedCategory, selectedAccount, crmUser]);
```

#### 2. Initialize selectedAccount Correctly

Change the initial state to be undefined or derive it from user config when available:

```typescript
// BEFORE:
const [selectedAccount, setSelectedAccount] = useState<'yousif' | 'scenarios' | 'salma' | 'herman'>('yousif');

// AFTER (derive default from currentUserConfig or fallback):
const [selectedAccount, setSelectedAccount] = useState<'yousif' | 'scenarios' | 'salma' | 'herman'>(
  () => {
    // This won't work because crmUser isn't available at initial render
    // So we still need the useEffect approach
    return 'yousif'; // Still need a default, but the guard prevents premature fetch
  }
);
```

Since `crmUser` isn't available during initial render, the primary fix is the guard in the fetch effect.

#### 3. Add Guard to Unread Counts Fetch

Also add a similar guard to the unread counts fetch (lines 817-842):

```typescript
useEffect(() => {
  // Wait for crmUser to determine allowed accounts
  if (!crmUser) return;
  
  const fetchUnreadCounts = async () => {
    for (const account of allowedAccounts) {
      // ... existing fetch logic
    }
  };
  if (allowedAccounts.length > 0) {
    fetchUnreadCounts();
  }
}, [allowedAccounts, crmUser]);
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Lines 803-808 | Add `if (!crmUser) return;` guard before fetching emails |
| Lines 817-842 | Add `if (!crmUser) return;` guard before fetching unread counts |

---

## Expected Result

- When Salma logs in: Email page waits for user data to load, then fetches from `salma` account
- When Herman logs in: Email page waits for user data to load, then fetches from `herman` account
- When Yousif logs in: Email page waits for user data to load, then fetches from `yousif` account
- No more "yousif" emails appearing in other users' inboxes initially

---

## Technical Notes

- The `crmUser` loading is fast (typically under 500ms) so the delay will be minimal
- The loading state (`isLoading`) will show the spinner during this brief wait
- This approach is more reliable than trying to initialize state from async data
