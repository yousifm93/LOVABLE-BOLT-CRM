
# Plan: Fix Category Emails Not Showing (Account Isolation Issue)

## Problem

When clicking on a category like "Needs Attention" that shows a count of 3, no emails are displayed. This happens because:

1. **Category counts** are calculated from the global `email_categories` database table
2. **The table is missing an `account` column** - it only stores `email_uid` and `email_folder`
3. Email UIDs are **account-specific** (UID 4319 in Yousif's inbox is different from UID 4319 in Salma's inbox)
4. All existing category assignments were made for Yousif's account
5. When Salma views categories, the counts show 3, but her mailbox doesn't have emails with those UIDs

## Solution

Add an `account` column to the `email_categories` table and filter categories by the currently selected account.

### Database Change

Add migration to add `account` column:

```sql
-- Add account column to email_categories
ALTER TABLE email_categories ADD COLUMN IF NOT EXISTS account VARCHAR(50) DEFAULT 'yousif';

-- Update existing records to 'yousif' (since all were created before multi-account)
UPDATE email_categories SET account = 'yousif' WHERE account IS NULL;
```

### Code Changes

#### 1. Update `fetchEmailCategories` to filter by account

**File:** `src/pages/Email.tsx`

Modify the `fetchEmailCategories` function to accept an account parameter and filter results:

```typescript
// Current (lines 443-461):
const fetchEmailCategories = useCallback(async () => {
  const { data, error } = await supabase.from('email_categories').select('*');
  // ...
}, []);

// Updated:
const fetchEmailCategories = useCallback(async (account: string) => {
  const { data, error } = await supabase
    .from('email_categories')
    .select('*')
    .eq('account', account);
  // ...
}, []);
```

#### 2. Update `useEffect` to call with selected account

Update the effect that calls `fetchEmailCategories` to pass the account:

```typescript
// Current (lines 800-802):
useEffect(() => {
  fetchEmailCategories();
}, [fetchEmailCategories]);

// Updated:
useEffect(() => {
  if (selectedAccount) {
    fetchEmailCategories(selectedAccount);
  }
}, [fetchEmailCategories, selectedAccount]);
```

#### 3. Update category insertion to include account

Modify the `handleDragEnd` function to include account when saving categories:

```typescript
// Current insert (around line 1150):
await supabase.from('email_categories').insert({
  email_uid: email.uid,
  email_folder: folder,
  category: targetCategory
});

// Updated:
await supabase.from('email_categories').insert({
  email_uid: email.uid,
  email_folder: folder,
  category: targetCategory,
  account: selectedAccount
});
```

#### 4. Update bulk category moves to include account

Similar update for bulk move operations.

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| Database migration | Add `account` column to `email_categories` table |
| `fetchEmailCategories` | Filter by selected account |
| useEffect for categories | Pass selected account when fetching |
| `handleDragEnd` | Include account when inserting category |
| Bulk move functions | Include account when inserting categories |

---

## Expected Result

- Category counts will only show emails from the currently selected account
- Clicking a category will correctly display emails that belong to that account
- New category assignments will be properly associated with the current account
- Multi-account email management will work correctly with categories

---

## Technical Notes

- Existing category records will default to 'yousif' since that was the original default account
- This is a backwards-compatible change - old data continues to work for Yousif
- Future consideration: Could add a unique constraint on (email_uid, email_folder, account)
