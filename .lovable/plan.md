

# Plan: Activate Email Feature for Salma and Herman

## Overview
Enable full email access for `salma@mortgagebolt.org` and `herman@mortgagebolt.org`, including:
1. Unlock their Email navigation permission so they can access the Email tab
2. Add their inboxes to the Email page sidebar (like Yousif and Scenarios)
3. Configure IMAP credentials so they can view their mailboxes

---

## Current State

| User | Email Permission | Home Inbox | Can Access Email Tab |
|------|------------------|------------|---------------------|
| Yousif | `visible` | `visible` | ✅ Yes |
| Herman | `locked` | `locked` | ❌ No |
| Salma | `locked` | `locked` | ❌ No |

---

## Changes Required

### 1. Database: Update Permissions

Update the `user_permissions` table to unlock email access for both users:

```sql
-- Salma (user_id: 159376ae-30e9-4997-b61f-76ab8d7f224b)
UPDATE user_permissions 
SET email = 'visible', home_inbox = 'visible'
WHERE user_id = '159376ae-30e9-4997-b61f-76ab8d7f224b';

-- Herman (user_id: fa92a4c6-890d-4d69-99a8-c3adc6c904ee)
UPDATE user_permissions 
SET email = 'visible', home_inbox = 'visible'
WHERE user_id = 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';
```

### 2. Secrets: Add IONOS Passwords

Add two new secrets for their IONOS email passwords:
- `SALMA_EMAIL_PASSWORD` - for salma@mortgagebolt.org
- `HERMAN_EMAIL_PASSWORD` - for herman@mortgagebolt.org

**You will need to provide the IONOS passwords for both accounts.**

### 3. Edge Function: Update `fetch-emails-imap/index.ts`

Add Salma and Herman to the ACCOUNTS configuration:

```typescript
const ACCOUNTS: Record<string, { user: string; passwordEnvVar: string }> = {
  yousif: {
    user: "yousif@mortgagebolt.org",
    passwordEnvVar: "IONOS_EMAIL_PASSWORD",
  },
  scenarios: {
    user: "scenarios@mortgagebolt.org",
    passwordEnvVar: "SCENARIOS_EMAIL_PASSWORD",
  },
  salma: {
    user: "salma@mortgagebolt.org",
    passwordEnvVar: "SALMA_EMAIL_PASSWORD",
  },
  herman: {
    user: "herman@mortgagebolt.org",
    passwordEnvVar: "HERMAN_EMAIL_PASSWORD",
  },
};
```

Update the TypeScript type to include the new accounts:
```typescript
interface FetchEmailsRequest {
  account?: 'yousif' | 'scenarios' | 'salma' | 'herman';
  // ... rest unchanged
}
```

### 4. Frontend: Update `src/pages/Email.tsx`

#### A) Update Account Type

```typescript
const [selectedAccount, setSelectedAccount] = useState<'yousif' | 'scenarios' | 'salma' | 'herman'>('yousif');
```

#### B) Add to Unread Counts State

```typescript
const [accountUnreadCounts, setAccountUnreadCounts] = useState<Record<string, number>>({
  yousif: 0,
  scenarios: 0,
  salma: 0,
  herman: 0
});
```

#### C) Add Inbox Buttons to Sidebar

In the ACCOUNTS section, add buttons for Salma and Herman:

```tsx
{/* Salma Inbox */}
<button
  onClick={() => {
    setSelectedAccount('salma');
    setSelectedCategory(null);
    setSelectedFolder('Inbox');
  }}
  className={cn(
    "w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors",
    selectedAccount === 'salma' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  )}
>
  <div className="flex items-center gap-2">
    <Mail className="h-4 w-4" />
    <span className="truncate">Salma Inbox</span>
  </div>
  {accountUnreadCounts.salma > 0 && (
    <span className={cn(
      "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
      selectedAccount === 'salma' 
        ? "bg-primary-foreground/20 text-primary-foreground" 
        : "bg-blue-500 text-white"
    )}>
      {accountUnreadCounts.salma}
    </span>
  )}
</button>

{/* Herman Inbox */}
<button
  onClick={() => {
    setSelectedAccount('herman');
    setSelectedCategory(null);
    setSelectedFolder('Inbox');
  }}
  className={cn(
    "w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors",
    selectedAccount === 'herman' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  )}
>
  <div className="flex items-center gap-2">
    <Mail className="h-4 w-4" />
    <span className="truncate">Herman Inbox</span>
  </div>
  {accountUnreadCounts.herman > 0 && (
    <span className={cn(
      "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
      selectedAccount === 'herman' 
        ? "bg-primary-foreground/20 text-primary-foreground" 
        : "bg-blue-500 text-white"
    )}>
      {accountUnreadCounts.herman}
    </span>
  )}
</button>
```

#### D) Update Initial Unread Count Fetch

Update the useEffect that fetches unread counts to include all 4 accounts:

```typescript
useEffect(() => {
  const fetchUnreadCounts = async () => {
    for (const account of ['yousif', 'scenarios', 'salma', 'herman'] as const) {
      // ... fetch logic
    }
  };
  fetchUnreadCounts();
}, []);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database | UPDATE `user_permissions` for Salma and Herman |
| Secrets | Add `SALMA_EMAIL_PASSWORD` and `HERMAN_EMAIL_PASSWORD` |
| `supabase/functions/fetch-emails-imap/index.ts` | Add salma and herman to ACCOUNTS config |
| `src/pages/Email.tsx` | Add inbox buttons for Salma and Herman |

---

## What You Need to Provide

Before I can implement this, please provide:

1. **IONOS password for salma@mortgagebolt.org**
2. **IONOS password for herman@mortgagebolt.org**

These will be stored securely as Supabase secrets (`SALMA_EMAIL_PASSWORD` and `HERMAN_EMAIL_PASSWORD`).

---

## Result

After implementation:
- Salma and Herman can access the Email tab in the sidebar (unlocked)
- The Email page will show 4 inboxes in the ACCOUNTS section:
  - Yousif Inbox
  - Scenarios Inbox  
  - Salma Inbox
  - Herman Inbox
- Each inbox shows unread count badges
- Users can switch between any inbox to view/manage emails

