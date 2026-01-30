
# Plan: Fix Ashley's Email Configuration, Notification Badge, and Verify Contact List Changes

## Summary

This plan addresses all reported issues with Ashley's email access, the notification badge popover, and confirms the master contact list changes.

---

## Issue 1: Master Contact List Changes Not Appearing

### Analysis
After reviewing `src/pages/contacts/BorrowerList.tsx`, the changes **have been implemented**:
- **Contact Type column**: Lines 379-411 with `InlineEditSelect`
- **Editable Notes**: Lines 532-564 with `InlineEditNotes`
- **Last Updated column**: Lines 567-587 with `formatDistanceToNow`
- **Updated By column**: Lines 589-604 with user lookup

### Likely Cause
The preview may not have refreshed with the latest build. A hard refresh should display these columns.

### Verification
No code changes needed - these columns are already implemented. User should:
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Check if the new columns appear

---

## Issue 2: Ashley's Email - Wrong Email Address

### Problem
The edge function is configured with:
- `processing@mortgagevault.org`

But the correct email is:
- `processor@mortgagebolt.org`

This is a different domain (mortgagebolt.org vs mortgagevault.org) AND a different username (processor vs processing).

### Fix
Update `supabase/functions/fetch-emails-imap/index.ts` line 32:

```typescript
ashley: {
  user: "processor@mortgagebolt.org",  // Changed from processing@mortgagevault.org
  passwordEnvVar: "ASHLEY_EMAIL_PASSWORD",
},
```

### Required Action
The `ASHLEY_EMAIL_PASSWORD` secret needs to be updated with the correct password for `processor@mortgagebolt.org`.

---

## Issue 3: Hide Scenarios Inbox for Ashley

### Problem
The current code shows Scenarios Inbox for all users in `USER_ACCOUNT_MAP`. Ashley should only see her own inbox.

### Fix
Update `src/pages/Email.tsx` around lines 1525-1553 to conditionally hide Scenarios for Ashley:

```typescript
{/* Scenarios Inbox - Hide for Ashley, show for other known users */}
{currentUserConfig && currentUserConfig.primary !== 'ashley' && (
  <button onClick={() => { ... }}>
    Scenarios Inbox
  </button>
)}
```

Also update the `allowedAccounts` logic at lines 218-220 to exclude scenarios for Ashley:

```typescript
const allowedAccounts = currentUserConfig 
  ? (currentUserConfig.primary === 'ashley' 
      ? [currentUserConfig.primary] as const
      : [currentUserConfig.primary, 'scenarios'] as const)
  : ['yousif', 'scenarios', 'salma', 'herman'] as const;
```

---

## Issue 4: Notification Badge Popover Not Opening

### Problem
Looking at `MentionNotificationBadge.tsx`, the current structure is:

```tsx
<PopoverTrigger asChild>
  <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
    <Badge>...</Badge>
  </div>
</PopoverTrigger>
```

The `stopPropagation()` on the div prevents the click from reaching the `PopoverTrigger`, so `onOpenChange` is never called.

### Fix
Change the approach - manually toggle the popover state in the onClick handler:

```tsx
<PopoverTrigger asChild>
  <div
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!open);  // Manually toggle
    }}
  >
    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs cursor-pointer ml-1">
      {unreadCount}
    </Badge>
  </div>
</PopoverTrigger>
```

---

## Issue 5: Account Unread Counts Missing Ashley

### Problem
In `src/pages/Email.tsx` at line 891, the `newCounts` object doesn't include `ashley`:

```typescript
const newCounts = { yousif: 0, scenarios: 0, salma: 0, herman: 0 };  // Missing ashley!
```

### Fix
Add ashley to the counts object:

```typescript
const newCounts = { yousif: 0, scenarios: 0, salma: 0, herman: 0, ashley: 0 };
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/fetch-emails-imap/index.ts` | Fix email address: `processor@mortgagebolt.org` |
| `src/pages/Email.tsx` | Hide Scenarios for Ashley, add ashley to unread counts |
| `src/components/MentionNotificationBadge.tsx` | Add manual toggle in onClick handler |

---

## Secrets Update Required

The `ASHLEY_EMAIL_PASSWORD` secret needs to be updated with the IONOS password for `processor@mortgagebolt.org`.

---

## Expected Results

1. **Master Contact List**: New columns visible after page refresh
2. **Ashley's Email**: Connects to `processor@mortgagebolt.org` and loads emails
3. **Scenarios Inbox**: Hidden for Ashley, only her inbox appears
4. **Notification Badge**: Clicking the red "2" opens the popover with mentions list
5. **Mention Navigation**: Clicking "View in CRM" navigates directly to the lead file
