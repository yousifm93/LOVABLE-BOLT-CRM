
# Plan: Master Contact List Improvements, Ashley's Email Access, and Notification Badge Fix

## Summary

This plan addresses several distinct improvements:

1. **Master Contact List - Contact Type Column**: Add a "Contact Type" column (Borrower, Real Estate Agent, Lender, Other)
2. **Master Contact List - Editable Notes**: Make the Notes column clickable/editable inline
3. **Master Contact List - Activity Log**: Add "Last Updated" and "Updated By" columns
4. **Ashley's Email Access**: Update USER_ACCOUNT_MAP to show only Ashley's inbox (processing) + Scenarios
5. **Notification Badge Click Fix**: The popover isn't opening because the Radix Popover needs controlled state management

---

## Issue 1: Master Contact List - Contact Type Column

### Current State
The "Source" column shows where the contact came from (Email, Pipeline, etc.) but doesn't categorize the actual type of contact.

### Solution
Add a new "Contact Type" column that displays one of: Borrower, Real Estate Agent, Lender, or Other. This will be derived from:
- `source === 'buyer_agents'` → "Real Estate Agent"
- `source === 'lenders'` → "Lender"
- `source === 'leads'` → "Borrower"
- `source === 'contacts'` → Check `type` field or "Other"

For the `contacts` table entries, we can also make this editable via a dropdown.

### Technical Changes

**File: `src/pages/contacts/BorrowerList.tsx`**
- Add a new "Contact Type" column definition after "Contact Name"
- Use a helper function to map source/type to display category
- Make it editable for `contacts` table entries using `InlineEditSelect`

---

## Issue 2: Master Contact List - Editable Notes

### Current State
The Notes column (lines 473-486, 302-316) displays notes read-only. The `user_notes` column exists in the `contacts` table but isn't editable inline from the table view.

### Solution
Replace the static notes display with an inline-editable component that:
- Shows truncated note text when not editing
- Opens an edit mode when clicked
- Saves to the `contacts` table `user_notes` field

### Technical Changes

**File: `src/pages/contacts/BorrowerList.tsx`**
- Modify the "Notes" column cell to use `InlineEditNotes` component
- Pass an `onValueChange` handler that updates the contact's `user_notes` field
- Only enable editing for contacts from the `contacts` table (not agents/lenders)

---

## Issue 3: Master Contact List - Activity Log (Last Updated)

### Current State
No columns show when a contact was last updated or by whom.

### Solution
Add two columns:
1. **Last Updated**: Display `updated_at` timestamp from the `contacts` table
2. **Updated By**: Display the user who last modified the contact

Note: The `contacts` table needs an `updated_at` column (may already exist) and potentially an `updated_by` column. If not, we'll add them via migration and create a trigger.

### Technical Changes

**Database Migration:**
```sql
-- Add updated_at and updated_by if not exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create trigger to auto-update
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = get_current_crm_user_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at_trigger
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();
```

**File: `src/pages/contacts/BorrowerList.tsx`**
- Add "Last Updated" column showing formatted `updated_at`
- Add "Updated By" column with user name lookup

---

## Issue 4: Ashley's Email Access

### Current State
The `USER_ACCOUNT_MAP` in `src/pages/Email.tsx` (lines 200-204) maps user IDs to their email accounts:
```tsx
const USER_ACCOUNT_MAP: Record<string, { primary: 'yousif' | 'salma' | 'herman'; label: string }> = {
  '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e': { primary: 'yousif', label: 'Yousif Inbox' },
  '159376ae-30e9-4997-b61f-76ab8d7f224b': { primary: 'salma', label: 'Salma Inbox' },
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee': { primary: 'herman', label: 'Herman Inbox' },
};
```

Ashley's CRM user ID is `3dca68fc-ee7e-46cc-91a1-0c6176d4c32a` and she needs access to `processing@mortgagevault.org`.

### Problem
Ashley is NOT in the USER_ACCOUNT_MAP, so the code falls back to showing ALL inboxes (lines 1554-1660), which is why she sees Yousif, Salma, Herman, and Scenarios inboxes.

### Solution
1. Add a new account type `'ashley'` (or `'processing'`) to handle Ashley's inbox
2. Update the type definitions to include this new account
3. Add Ashley to USER_ACCOUNT_MAP
4. Add handling for the `ashley` account in the fetch-emails-imap edge function

### Technical Changes

**File: `src/pages/Email.tsx`**
```tsx
// Update type
const USER_ACCOUNT_MAP: Record<string, { primary: 'yousif' | 'salma' | 'herman' | 'ashley'; label: string }> = {
  '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e': { primary: 'yousif', label: 'Yousif Inbox' },
  '159376ae-30e9-4997-b61f-76ab8d7f224b': { primary: 'salma', label: 'Salma Inbox' },
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee': { primary: 'herman', label: 'Herman Inbox' },
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a': { primary: 'ashley', label: 'Ashley Inbox' },
};

// Update selectedAccount state type
const [selectedAccount, setSelectedAccount] = useState<'yousif' | 'scenarios' | 'salma' | 'herman' | 'ashley'>('yousif');

// Update accountUnreadCounts type
const [accountUnreadCounts, setAccountUnreadCounts] = useState<Record<string, number>>({
  yousif: 0,
  scenarios: 0,
  salma: 0,
  herman: 0,
  ashley: 0,
});
```

**File: `supabase/functions/fetch-emails-imap/index.ts`**
- Add Ashley's email credentials handling (ASHLEY_EMAIL_PASSWORD secret needed)

**Supabase Secrets:**
- Need to add `ASHLEY_EMAIL_PASSWORD` secret for `processing@mortgagevault.org`

---

## Issue 5: Notification Badge Not Opening Popover

### Current State
Looking at `MentionNotificationBadge.tsx`, the Popover has:
- `open={open}` and `onOpenChange={setOpen}` for controlled state
- Badge has `onClick` with `e.preventDefault()` and `e.stopPropagation()`

The issue is that the Badge's onClick prevents default, but the `PopoverTrigger` needs the click to toggle the popover. The `onOpenChange` should handle this, but the click events are being stopped.

### Solution
The `PopoverTrigger` with `asChild` passes its click handler to the child, but when we add our own `onClick` that stops propagation, it may interfere. We need to let the Popover handle the click naturally while still preventing the NavLink navigation.

We should:
1. Wrap the entire Badge in a div that stops propagation
2. Let the Badge act as the trigger without its own onClick

### Technical Changes

**File: `src/components/MentionNotificationBadge.tsx`**
```tsx
return (
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Badge 
          variant="destructive" 
          className="h-5 min-w-5 px-1.5 text-xs cursor-pointer ml-1"
        >
          {unreadCount}
        </Badge>
      </div>
    </PopoverTrigger>
    ...
  </Popover>
);
```

Or alternatively, remove the onClick from Badge entirely and rely on the Popover's trigger, but wrap in a span that stops propagation at the outer level.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/contacts/BorrowerList.tsx` | Add Contact Type column, make Notes editable, add Last Updated/Updated By columns |
| `src/pages/Email.tsx` | Add Ashley to USER_ACCOUNT_MAP, update type definitions for 'ashley' account |
| `src/components/MentionNotificationBadge.tsx` | Fix popover trigger to work with NavLink wrapper |
| `supabase/functions/fetch-emails-imap/index.ts` | Add Ashley's email account handling |
| `supabase/migrations/[new].sql` | Add updated_at/updated_by columns to contacts table with trigger |

---

## Expected Results

1. **Contact Type Column**: Displays "Borrower", "Real Estate Agent", "Lender", or "Other" for each contact
2. **Editable Notes**: Click on notes cell to edit inline, saves to `user_notes` field
3. **Activity Log**: Shows when contact was last updated and by whom
4. **Ashley's Email**: Only shows "Ashley Inbox" and "Scenarios Inbox" in the Accounts section
5. **Notification Badge**: Clicking the red "2" badge opens a popover showing where Ashley was mentioned with navigation links
