

# Plan: Add Unread Email Indicators and Account Unread Counts

## Overview
Enhance the email client to match modern email UI patterns:
1. Add a blue dot indicator next to unread emails in the list
2. Display unread email counts next to each inbox account (Yousif Inbox, Scenarios Inbox) in the sidebar

---

## Changes

### File: `src/pages/Email.tsx`

#### A) Add Unread Count State Per Account

Add state to track unread counts for each account:

```typescript
const [accountUnreadCounts, setAccountUnreadCounts] = useState<Record<string, number>>({
  yousif: 0,
  scenarios: 0
});
```

#### B) Update `fetchEmails` to Track Unread Counts

Modify the email fetching logic to update `accountUnreadCounts` when emails are loaded:

```typescript
// After fetching emails, update unread count for the current account
const unreadCount = fetchedEmails.filter((e: EmailMessage) => e.unread).length;
setAccountUnreadCounts(prev => ({
  ...prev,
  [account]: unreadCount
}));
```

#### C) Add Unread Dot to Email List Items

In the email list rendering section (around line 1485), add a blue dot indicator for unread emails:

```tsx
<div className={cn("flex items-center gap-2 mb-1 w-full", showMultiSelect ? "pl-6" : "pl-4")}>
  {/* NEW: Unread indicator dot */}
  {email.unread && (
    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
  )}
  <span className={cn(
    "text-sm truncate min-w-0 flex-1",
    email.unread ? "font-semibold" : "font-medium"
  )}>
    {email.from}
  </span>
  {/* ... rest of the row */}
</div>
```

The subject line and snippet already have conditional font styling based on `email.unread`.

#### D) Display Unread Counts Next to Account Buttons

Update the ACCOUNTS section in the sidebar (lines 1349-1380) to show unread counts:

```tsx
{/* Yousif Inbox */}
<button
  onClick={() => {
    setSelectedAccount('yousif');
    setSelectedCategory(null);
    setSelectedFolder('Inbox');
  }}
  className={cn(
    "w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors",
    selectedAccount === 'yousif' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  )}
>
  <div className="flex items-center gap-2">
    <Mail className="h-4 w-4" />
    <span className="truncate">Yousif Inbox</span>
  </div>
  {accountUnreadCounts.yousif > 0 && (
    <span className={cn(
      "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
      selectedAccount === 'yousif' 
        ? "bg-primary-foreground/20 text-primary-foreground" 
        : "bg-blue-500 text-white"
    )}>
      {accountUnreadCounts.yousif}
    </span>
  )}
</button>

{/* Scenarios Inbox - same pattern */}
<button ... >
  ...
  {accountUnreadCounts.scenarios > 0 && (
    <span className={cn(
      "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
      selectedAccount === 'scenarios' 
        ? "bg-primary-foreground/20 text-primary-foreground" 
        : "bg-blue-500 text-white"
    )}>
      {accountUnreadCounts.scenarios}
    </span>
  )}
</button>
```

#### E) Optional: Fetch Unread Counts for Both Accounts on Initial Load

To show accurate unread counts even for the non-selected account, add an initial fetch for both accounts' unread counts when the component mounts:

```typescript
// Fetch unread count for both accounts on mount
useEffect(() => {
  const fetchUnreadCounts = async () => {
    for (const account of ['yousif', 'scenarios'] as const) {
      try {
        const { data } = await supabase.functions.invoke("fetch-emails-imap", {
          body: {
            account,
            folder: 'Inbox',
            limit: 50,
            offset: 0
          }
        });
        if (data?.success && data.emails) {
          const unreadCount = data.emails.filter((e: EmailMessage) => e.unread).length;
          setAccountUnreadCounts(prev => ({ ...prev, [account]: unreadCount }));
        }
      } catch (error) {
        console.error(`Error fetching unread count for ${account}:`, error);
      }
    }
  };
  fetchUnreadCounts();
}, []);
```

---

## Visual Result

**Email List Row (Unread):**
```
● Yousif                                          2:32 PM
  Re: Loan Scenario Inquiry - Advancial
```

**Email List Row (Read):**
```
  Yousif                                          2:31 PM
  Re: Loan Scenario Inquiry - Acra  
```

**Sidebar Accounts Section:**
```
ACCOUNTS
✉ Yousif Inbox      (2)  ← blue badge showing 2 unread
✉ Scenarios Inbox   (1)  ← blue badge showing 1 unread
```

---

## Technical Summary

| Change | Location |
|--------|----------|
| Add `accountUnreadCounts` state | Line ~224 |
| Update `fetchEmails` to track unread counts | Line ~600 |
| Add blue dot for unread emails | Line ~1485 |
| Show unread counts on account buttons | Lines 1349-1380 |
| Fetch initial counts for both accounts | New useEffect |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Email.tsx` | Add unread dot indicator, add account unread counts state, show counts in sidebar |

