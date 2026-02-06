

# Fix: Notes Not Persisting in Leads Page

## Investigation Results

After thorough code review and database inspection, I found:
- The database confirms that the "test" lead has NEVER been updated (`updated_at` equals `created_at`)
- The save code logic is correct -- RLS policies allow updates, the `updateLead` function works, and other leads have saved notes successfully
- The "About the Borrower" section requires clicking a **Save** button after typing, which may not be obvious

## Root Cause

The current design requires a manual "Save" click after typing notes. The Save button only appears after you start typing, and it's a small button below the textarea. If you type notes and then close the drawer (or click elsewhere) without clicking Save, the notes are lost silently.

## Fix: Add Auto-Save + Prominent Save Indicators

### File: `src/components/ClientDetailDrawer.tsx`

**1. Add auto-save on drawer close for unsaved notes/file updates:**

When the user closes the drawer (clicks X or clicks outside), check if there are unsaved notes or file updates. If so, auto-save them before closing instead of silently discarding.

Update the close handler to detect unsaved changes and save them:

```typescript
// In the drawer close logic, before actually closing:
if (hasUnsavedNotes && localNotes) {
  // Auto-save notes before closing
  const { data: { user } } = await supabase.auth.getUser();
  const { data: crmUser } = await supabase
    .from('users').select('id').eq('auth_user_id', user?.id).single();
  await databaseService.updateLead(leadId!, {
    notes: localNotes,
    notes_updated_by: crmUser?.id || null,
    notes_updated_at: new Date().toISOString()
  });
}
// Same for file updates
```

**2. Add a visual unsaved indicator:**

Show a yellow "Unsaved changes" warning badge near the Save button so it's clear the user needs to save.

**3. Add onBlur auto-save to the textarea:**

When the user clicks away from the textarea (onBlur), auto-save if there are unsaved changes. This matches common UX patterns where inline editors save on blur.

```typescript
<Textarea
  onBlur={async () => {
    if (hasUnsavedNotes && localNotes !== currentNotes) {
      // Trigger the same save logic
      await saveNotes();
    }
  }}
  ...
/>
```

**4. Extract save logic into a reusable function:**

Move the save logic from the inline button onClick into a `saveNotes()` function and a `saveFileUpdates()` function that can be called from multiple places (button click, blur, drawer close).

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/ClientDetailDrawer.tsx` | Extract save functions, add auto-save on blur and drawer close, add unsaved changes indicator |

## Result

After this fix:
- Notes auto-save when you click away from the textarea (onBlur)
- Notes auto-save when you close the drawer
- A visible "Unsaved" indicator shows when changes haven't been saved yet
- The manual Save button still works as before
- Same behavior applies to "Latest File Update" section

