
# Plan: Fix Category Emails Not Displaying (UID Mismatch Issue)

## Problem

When clicking the "Reviewed - N/A" category (showing count of 18), the main panel displays "No emails in Reviewed - N/A". This happens because:

1. **Category counts work correctly**: The count (18) is calculated from the `email_categories` database table, correctly filtered by account (`yousif`)

2. **Categorized emails have old UIDs**: The database shows emails with UIDs 1061-1172

3. **Loaded emails are recent**: The IMAP fetch returns the most recent 50 emails (UIDs in the 4000+ range)

4. **Matching fails**: The `getCategoryEmails()` function tries to find category UIDs in the loaded `emails` array - but those old emails aren't loaded

```typescript
// Current logic (line 1277-1280)
const getCategoryEmails = () => {
  const categoryEmailUids = emailCategories.filter(c => c.category === selectedCategory).map(c => c.email_uid);
  return emails.filter(e => categoryEmailUids.includes(e.uid)); // ← Returns empty array!
};
```

---

## Solution

When a category is selected, fetch those specific emails by UID from IMAP instead of filtering from already-loaded emails.

### Approach

1. Add a `uids` parameter to the IMAP edge function to fetch multiple specific emails by UID
2. When a category is clicked, call the IMAP function with the list of UIDs from that category
3. Store/display those category-specific emails

---

## Implementation

### 1. Update Edge Function: `supabase/functions/fetch-emails-imap/index.ts`

Add support for a `uids` parameter to fetch multiple emails by UID:

```typescript
interface FetchEmailsRequest {
  // ... existing params
  uids?: number[];  // New: fetch specific emails by UID
}

// In the handler, add:
if (uids && uids.length > 0) {
  console.log(`Fetching ${uids.length} specific emails by UID`);
  const uidRange = uids.join(',');
  
  for await (const message of client.fetch(uidRange, {
    envelope: true,
    flags: true,
    bodyStructure: true,
  }, { uid: true })) {
    // Build EmailMessage object same as existing logic
    emails.push({ uid: message.uid, ... });
  }
  
  return new Response(JSON.stringify({ success: true, emails }), ...);
}
```

### 2. Update Email Page: `src/pages/Email.tsx`

#### A. Add function to fetch category emails by UID

```typescript
const fetchCategoryEmails = useCallback(async (categoryKey: string) => {
  setIsLoading(true);
  try {
    // Get UIDs for this category from database
    const categoryEmailUids = emailCategories
      .filter(c => c.category === categoryKey)
      .map(c => c.email_uid);
    
    if (categoryEmailUids.length === 0) {
      setEmails([]);
      return;
    }
    
    // Fetch those specific emails from IMAP by UID
    const { data, error } = await supabase.functions.invoke("fetch-emails-imap", {
      body: {
        account: selectedAccount,
        folder: 'Inbox',  // Categories are all from Inbox
        uids: categoryEmailUids
      }
    });
    
    if (error) throw error;
    if (data.success && data.emails) {
      setEmails(data.emails);
    }
  } catch (error) {
    console.error('Error fetching category emails:', error);
    toast({ title: "Failed to load category emails", variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
}, [emailCategories, selectedAccount, toast]);
```

#### B. Update category click handler to fetch emails

```typescript
// When category is selected, fetch those specific emails
useEffect(() => {
  if (selectedCategory) {
    fetchCategoryEmails(selectedCategory);
  }
}, [selectedCategory, fetchCategoryEmails]);
```

#### C. Update `getCategoryEmails()` to return loaded emails directly

```typescript
const getCategoryEmails = () => {
  // When category is selected, emails state already contains category emails
  if (!selectedCategory) return [];
  return emails;  // Emails were fetched specifically for this category
};
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/fetch-emails-imap/index.ts` | Add `uids` parameter to fetch specific emails by UID |
| `src/pages/Email.tsx` | Add `fetchCategoryEmails` function that fetches emails by UID |
| `src/pages/Email.tsx` | Update category selection to trigger UID-based fetch |
| `src/pages/Email.tsx` | Simplify `getCategoryEmails()` since emails are pre-fetched |

---

## Expected Result

- Clicking "Reviewed - N/A" (showing 18) will now display all 18 categorized emails
- Category counts will match displayed emails
- Works for all categories (Needs Attention, File, Lender Mktg, custom categories)
- Old emails that were categorized months ago will still be accessible

---

## Technical Notes

- The IMAP `fetch()` command supports comma-separated UID ranges (e.g., "1061,1062,1063")
- This adds one additional IMAP call when clicking a category, but only fetches the exact emails needed
- Consider adding caching to avoid re-fetching if category is clicked multiple times
