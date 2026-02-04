
# Plan: Fix Three CRM Issues

## Summary

Fixing three issues reported by the user:
1. **Latest File Update formatting** - Improve spacing and readability in the `FileUpdatesDisplay` component
2. **"Finalize Closing Package" task not created for CTC** - The automation is blocked because an old task with the same name already exists in "To Do" status
3. **Emails not marked as read** - The IMAP edge function doesn't have functionality to mark emails as read when viewing them

---

## Issue Analysis

### 1. Latest File Update Formatting Issues
**Current Problems:**
- Minimal spacing (`space-y-1`) makes entries hard to read
- Top padding creates unwanted space
- Text is cramped and not user-friendly

**Solution:**
- Increase spacing between entries from `space-y-1` to `space-y-3`
- Remove top padding in the container
- Add better visual separation between update entries
- Add bullet points for each entry for clearer visual structure

### 2. "Finalize Closing Package" Task Not Created
**Root Cause Found:**
The database has a task "Finalize Closing Package" (created 2026-01-13) that is still in "To Do" status. The automation's duplicate prevention logic correctly blocks creating a new task because:
```sql
IF NOT EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.borrower_id = NEW.id
    AND t.title = automation_record.task_name
    AND t.status::text NOT IN ('Done')
)
```

**Solution:**
This is **working as designed** - the automation prevents duplicate tasks. The old task should be completed before changing status again, OR we should consider allowing re-creation if the previous task was created more than X days ago.

**Recommended Fix:**
Update the trigger to allow re-creation if the previous matching task is older than 30 days OR if the loan status was previously changed away from CTC and back. This is a database trigger change.

### 3. Emails Not Marked as Read
**Root Cause Found:**
The `fetch-emails-imap` edge function fetches email content when clicked but **never calls** `client.messageFlagsAdd` to set the `\Seen` flag on the IMAP server.

**Solution:**
Add mark-as-read functionality when fetching email content:
```typescript
// After fetching content, mark as read
await client.messageFlagsAdd(String(messageUid), ['\\Seen'], { uid: true });
```

Also update the frontend to:
1. Update local unread state after selecting an email
2. Update folder/account unread counts

---

## Implementation Details

### File 1: `src/components/lead-details/FileUpdatesDisplay.tsx`
**Changes:**
- Increase `space-y-1` to `space-y-3` for better entry separation
- Add visual bullet/separator for each entry
- Remove excess top padding (`p-2` to `pt-0 px-2 pb-2`)
- Add margin-bottom to entry paragraphs

### File 2: `supabase/functions/fetch-emails-imap/index.ts`
**Changes:**
- Add `action: 'markRead'` support OR automatically mark as read when fetching content
- Call `client.messageFlagsAdd(uid, ['\\Seen'])` after content fetch
- Return updated `unread: false` status in response

### File 3: `src/pages/Email.tsx`
**Changes:**
- After fetching email content, update local email state to show as read
- Update `accountUnreadCounts` to decrement when email is opened
- Update `folderCounts` to decrement when email is opened

### File 4: Database Migration (for task automation fix)
**Changes:**
- Update `execute_loan_status_changed_automations` trigger to allow re-creation of tasks if:
  - The previous matching task was created more than 30 days ago, OR
  - The task was previously completed and the status is being changed again

---

## Technical Changes

### FileUpdatesDisplay.tsx Changes

| Section | Current | New |
|---------|---------|-----|
| Today's Updates container | `space-y-1` | `space-y-3` |
| Entry wrapper | No visual marker | Left border indicator |
| Main container padding | `p-2` | `pt-1 px-2 pb-2` |
| Entry paragraph margin | `mb-1` | `mb-2` |
| History entries | `space-y-2` | `space-y-3` |

### IMAP Edge Function Changes

Add after line 265 (after content fetch):
```typescript
// Mark email as read after viewing
try {
  await client.messageFlagsAdd(String(messageUid), ['\\Seen'], { uid: true });
  console.log(`Marked email UID ${messageUid} as read`);
} catch (flagError) {
  console.error('Error marking email as read:', flagError);
}
```

### Email.tsx Changes

In `handleSelectEmail` function, after fetching content:
```typescript
// Update local state to mark as read
setEmails(prev => prev.map(e => 
  e.uid === email.uid ? { ...e, unread: false } : e
));

// Update unread counts
if (email.unread) {
  setFolderCounts(prev => ({
    ...prev,
    [selectedFolder]: Math.max(0, (prev[selectedFolder] || 0) - 1)
  }));
  setAccountUnreadCounts(prev => ({
    ...prev,
    [selectedAccount]: Math.max(0, (prev[selectedAccount] || 0) - 1)
  }));
}
```

### Database Trigger Update

Modify duplicate prevention to consider task age:
```sql
IF NOT EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.borrower_id = NEW.id
    AND t.title = automation_record.task_name
    AND t.status::text NOT IN ('Done')
    AND t.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days')
)
```

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/lead-details/FileUpdatesDisplay.tsx` | Modify | Improve spacing and readability |
| `supabase/functions/fetch-emails-imap/index.ts` | Modify | Add mark-as-read functionality |
| `src/pages/Email.tsx` | Modify | Update local state when email is read |
| New migration file | Create | Update task automation trigger with 30-day window |

---

## Expected Results

1. **Latest File Update section** will have better spacing, clearer visual structure, and no unwanted top padding
2. **Task automations** will create new tasks even if an old matching task exists (if older than 30 days)
3. **Email read status** will update immediately when an email is clicked:
   - Blue dot indicator will disappear
   - Unread count will decrement in folder and account badges
   - The change will persist on the IMAP server

---

## Notes

- The Pipeline Review section is **already present** in the code (lines 2828-2886) and shows alongside Latest File Update. No change needed there.
- The task automation issue is by design but can be improved with the 30-day window
- The email read status was simply missing from the implementation
