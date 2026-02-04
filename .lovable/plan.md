
# Plan: Fix Multiple CRM Issues

## Summary

This plan addresses seven distinct issues reported by the user:

1. **Latest File Update formatting** - Should look like "About the Borrower" section (simple editable box)
2. **CTC Task automations not populating** - Tasks exist from January but trigger isn't creating new ones
3. **Lender email merge tag not working** - `{{AccountExecutiveFirstName}}` shows "Team" instead of actual name
4. **Lender email tracking** - Add columns for tracking email activity on lenders
5. **Approved Lenders default columns** - Should default to first 9 columns only
6. **Condo List pagination** - Change from 15 to 20 results per page
7. **Condo List title** - Change "Condolist" to "Condo List" (two words)

---

## Issue Analysis

### 1. Latest File Update Formatting
**Current State:** Uses `FileUpdatesDisplay` component with complex parsing, timestamps bolding, and collapsible history.

**User Request:** Make it look like "About the Borrower" section - a simple text box you can type into with "who updated" at the bottom.

**The Fix:** The Latest File Update section already uses `MentionableInlineEditNotes` (lines 2803-2808 in ClientDetailDrawer.tsx) for the Active stage. The issue is the `FileUpdatesDisplay` component is being used in the Pipeline Review section (line 2868) which shows the parsed/formatted view. The user wants both sections to be simple editable boxes. We need to replace `FileUpdatesDisplay` with a simple click-to-edit display.

### 2. CTC Task Automations Not Populating
**Root Cause:** Gaurav Sharma's tasks from the CTC trigger (Call Borrower, Call Buyer's Agent, Call Listing Agent, Finalize Closing Package) were created on 2026-01-13 and are still in "To Do" status. The duplicate prevention logic blocks re-creation because:
- Tasks are not "Done"
- Tasks are NOT older than 30 days (created 2026-01-13, today is 2026-02-04 = 22 days)

**The 30-day fix was just deployed** but 22 days < 30 days, so it correctly blocked.

**User Expectation:** When flipping to CTC again, new tasks should be created.

**The Fix:** Either:
- Reduce the window from 30 days to a shorter period (e.g., 7 days)
- OR change logic to allow re-creation if the status changed FROM CTC and back TO CTC

Recommended: Reduce to 14 days as a more practical window for operational workflows.

### 3. Lender Email Merge Tag Not Working
**Root Cause Found:** In `ApprovedLenders.tsx` line 1025-1029, the lenders passed to `BulkLenderEmailModal` only include:
```typescript
lenders={lenders.filter(l => selectedIds.has(l.id)).map(l => ({
  id: l.id,
  lender_name: l.lender_name,
  account_executive_email: l.account_executive_email
  // MISSING: account_executive field!
}))}
```

The `account_executive` field is NOT passed, so `replaceMergeTags` falls back to "Team".

**The Fix:** Add `account_executive` to the mapped lender object.

### 4. Lender Email Tracking
**User Request:** Add columns to track:
- Last email sent (date and content)
- Whether lender opened the email
- Whether lender replied and what they said

**The Fix:** 
- Add new database columns to `lenders` table: `last_email_sent_at`, `last_email_subject`, `last_email_opened`, `last_email_reply`
- Update the bulk email sending logic to record when emails are sent
- Note: Open/reply tracking requires email service integration (SendGrid webhooks) - this is a more complex feature

For immediate implementation: Add `last_email_sent_at` and `last_email_subject` columns and update after sending.

### 5. Approved Lenders Default Columns
**Current State:** `initialColumns` array defines column visibility, with first 8 columns visible by default plus Notes.

**User Request:** Only show first 9 columns (up to "Send Email"), plus Notes and Actions.

**The Fix:** Update `initialColumns` to set `visible: true` for the first 9 columns only.

### 6. Condo List Pagination
**Current State:** `pageSize={15}` on line 854 of Condolist.tsx

**The Fix:** Change to `pageSize={20}`

### 7. Condo List Title
**Current State:** `<h1>Condolist</h1>` on line 711

**The Fix:** Change to `<h1>Condo List</h1>`

---

## Technical Implementation

### File 1: `src/components/lead-details/FileUpdatesDisplay.tsx`
Simplify to a basic display format matching "About the Borrower" style - remove complex parsing, timestamps formatting, and collapsible sections.

### File 2: `src/components/ClientDetailDrawer.tsx`
Update Pipeline Review section to use same simple display as About the Borrower - a click-to-edit box.

### File 3: `src/pages/contacts/ApprovedLenders.tsx`
1. Add `account_executive` to the lender object passed to BulkLenderEmailModal
2. Update `initialColumns` to only show first 9 columns by default (rowNumber through send_email), plus notes

### File 4: `src/pages/resources/Condolist.tsx`
1. Change pageSize from 15 to 20
2. Change title from "Condolist" to "Condo List"

### File 5: Database Migration
1. Reduce task automation duplicate window from 30 days to 14 days
2. Add lender email tracking columns: `last_email_sent_at`, `last_email_subject`

### File 6: `src/components/modals/BulkLenderEmailModal.tsx`
After sending emails, update the lender record with `last_email_sent_at` and `last_email_subject`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lead-details/FileUpdatesDisplay.tsx` | Simplify to basic display format |
| `src/components/ClientDetailDrawer.tsx` | Make Pipeline Review use simple click-to-edit |
| `src/pages/contacts/ApprovedLenders.tsx` | Fix merge tag + default columns |
| `src/pages/resources/Condolist.tsx` | Page size 20, title "Condo List" |
| `src/components/modals/BulkLenderEmailModal.tsx` | Add email tracking update |
| New migration SQL | Reduce duplicate window, add lender columns |

---

## Expected Results

1. **Latest File Update** - Simple text box like "About the Borrower", with edit capability and "who updated when" footer
2. **CTC Tasks** - New tasks will be created if previous ones are older than 14 days
3. **Merge Tags** - `{{AccountExecutiveFirstName}}` will correctly show "David" instead of "Team"
4. **Email Tracking** - Lenders table will show when last email was sent
5. **Default Columns** - Only essential columns visible by default
6. **Condo List** - Shows 20 results, title displays as "Condo List"
