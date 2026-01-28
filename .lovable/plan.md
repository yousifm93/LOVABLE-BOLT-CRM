

# Plan: Filter Email Inboxes Per User

## Overview
Restrict inbox visibility so each user only sees their own inbox plus the shared Scenarios inbox:
- **Yousif** sees: Yousif Inbox + Scenarios Inbox
- **Salma** sees: Salma Inbox + Scenarios Inbox
- **Herman** sees: Herman Inbox + Scenarios Inbox

---

## Current State
All four inboxes (Yousif, Scenarios, Salma, Herman) are displayed to every user regardless of who is logged in.

---

## Changes Required

### File: `src/pages/Email.tsx`

#### 1. Create User-to-Account Mapping

Add a mapping near the top of the component (after the `useAuth()` hook) that determines which accounts each user can see:

```typescript
const { user, crmUser } = useAuth();

// Map CRM user IDs to their allowed email accounts
const USER_ACCOUNT_MAP: Record<string, { primary: 'yousif' | 'salma' | 'herman'; label: string }> = {
  '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e': { primary: 'yousif', label: 'Yousif Inbox' },
  '159376ae-30e9-4997-b61f-76ab8d7f224b': { primary: 'salma', label: 'Salma Inbox' },
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee': { primary: 'herman', label: 'Herman Inbox' },
};

// Get current user's allowed accounts (their own + scenarios)
const currentUserConfig = crmUser?.id ? USER_ACCOUNT_MAP[crmUser.id] : null;
const allowedAccounts = currentUserConfig 
  ? [currentUserConfig.primary, 'scenarios'] as const
  : ['yousif', 'scenarios', 'salma', 'herman'] as const; // Fallback for unknown users (e.g., admins)
```

#### 2. Set Default Account Based on User

Update the initial `selectedAccount` state to default to the user's own inbox:

```typescript
const [selectedAccount, setSelectedAccount] = useState<'yousif' | 'scenarios' | 'salma' | 'herman'>(
  currentUserConfig?.primary || 'yousif'
);
```

**Note:** Since `crmUser` loads asynchronously, we also need a `useEffect` to set the correct initial account once the user data is available:

```typescript
useEffect(() => {
  if (currentUserConfig?.primary) {
    setSelectedAccount(currentUserConfig.primary);
  }
}, [currentUserConfig?.primary]);
```

#### 3. Filter Unread Counts Fetch

Update the `fetchUnreadCounts` useEffect to only fetch counts for allowed accounts:

```typescript
useEffect(() => {
  const fetchUnreadCounts = async () => {
    // Only fetch for accounts this user can access
    const accountsToFetch = allowedAccounts;
    for (const account of accountsToFetch) {
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
  if (allowedAccounts.length > 0) {
    fetchUnreadCounts();
  }
}, [allowedAccounts]);
```

#### 4. Conditionally Render Account Buttons in Sidebar

Replace the hardcoded account buttons (lines ~1386-1494) with a dynamic rendering approach:

```tsx
{/* Accounts Section */}
<Separator className="mt-6 mb-3" />
<div className="flex items-center pl-2 pr-3 mb-2 pt-4">
  <p className="text-xs font-medium text-muted-foreground">ACCOUNTS</p>
</div>

{/* User's Primary Inbox */}
{currentUserConfig && (
  <button
    onClick={() => {
      setSelectedAccount(currentUserConfig.primary);
      setSelectedCategory(null);
      setSelectedFolder('Inbox');
    }}
    className={cn(
      "w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors",
      selectedAccount === currentUserConfig.primary ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
    )}
  >
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4" />
      <span className="truncate">{currentUserConfig.label}</span>
    </div>
    {accountUnreadCounts[currentUserConfig.primary] > 0 && (
      <span className={cn(
        "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
        selectedAccount === currentUserConfig.primary 
          ? "bg-primary-foreground/20 text-primary-foreground" 
          : "bg-blue-500 text-white"
      )}>
        {accountUnreadCounts[currentUserConfig.primary]}
      </span>
    )}
  </button>
)}

{/* Scenarios Inbox - Always visible */}
<button
  onClick={() => {
    setSelectedAccount('scenarios');
    setSelectedCategory(null);
    setSelectedFolder('Inbox');
  }}
  className={cn(
    "w-full flex items-center justify-between pl-2 pr-3 py-2 rounded-md text-sm transition-colors",
    selectedAccount === 'scenarios' ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
  )}
>
  <div className="flex items-center gap-2">
    <Mail className="h-4 w-4" />
    <span className="truncate">Scenarios Inbox</span>
  </div>
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

{/* Fallback: Show all inboxes if user not in map (admin/unknown) */}
{!currentUserConfig && (
  <>
    {/* Render all 4 account buttons as before */}
  </>
)}
```

---

## Visual Result

**When Salma logs in:**
```
ACCOUNTS
✉ Salma Inbox      (3)
✉ Scenarios Inbox  (1)
```

**When Herman logs in:**
```
ACCOUNTS
✉ Herman Inbox     (0)
✉ Scenarios Inbox  (1)
```

**When Yousif (or unknown admin) logs in:**
```
ACCOUNTS
✉ Yousif Inbox     (5)
✉ Scenarios Inbox  (1)
```

---

## Technical Summary

| Change | Location | Description |
|--------|----------|-------------|
| Add user-to-account mapping | After `useAuth()` | Map CRM user IDs to their primary inbox |
| Compute `allowedAccounts` | After mapping | Determine which accounts user can see |
| Set initial account | State initialization + useEffect | Default to user's own inbox |
| Filter unread fetch | `fetchUnreadCounts` useEffect | Only fetch counts for allowed accounts |
| Dynamic sidebar buttons | Lines ~1386-1494 | Only render user's inbox + scenarios |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Email.tsx` | Add user mapping, filter sidebar accounts, filter unread count fetching |

