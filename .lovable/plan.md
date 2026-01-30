
# Plan: Fix Mention Preview, Pending Approval Columns, and Contact Type Update

## Summary

This plan addresses four issues:
1. Mention notification preview shows HTML entities (`&nbsp;`) instead of clean text
2. Pending Approval section missing editable Contact Type and Notes columns  
3. "Failed to update contact" error when changing contact type
4. Need separate empty Notes field (user_notes) distinct from auto-extracted description

---

## Issue 1: Mention Preview Showing HTML Entities

### Problem
The notification shows `"@Ashley Merizio&nbsp;test"` instead of just the clean text `"This is a test."` 

The mention span is being included in the content preview. Looking at the code:
```typescript
const contentPreview = noteBody.replace(/<[^>]*>/g, '').substring(0, 100);
```

This regex removes HTML tags but leaves the `&nbsp;` entity and the mention text itself.

### Solution
Improve the content preview extraction to:
1. Decode HTML entities (`&nbsp;` → space)
2. Remove the `@Name` mention patterns from the preview text

**Files to modify:**
- `src/components/modals/ActivityLogModals.tsx` (line 788)
- `src/components/lead-details/ActivityCommentSection.tsx` (line 75)

**Updated code:**
```typescript
// Get content preview (strip HTML, decode entities, remove @mentions)
const plainText = noteBody
  .replace(/<[^>]*>/g, '')  // Remove HTML tags
  .replace(/&nbsp;/g, ' ')  // Decode nbsp
  .replace(/&amp;/g, '&')   // Decode ampersand
  .replace(/&lt;/g, '<')    // Decode less than
  .replace(/&gt;/g, '>')    // Decode greater than
  .replace(/@[A-Za-z]+\s+[A-Za-z]+/g, '')  // Remove @FirstName LastName patterns
  .trim();
const contentPreview = plainText.substring(0, 100);
```

---

## Issue 2: Pending Approval Section Missing Editable Columns

### Problem
The Pending Approval tab has its own column definition (lines 134-354) that doesn't include:
- Editable Contact Type column with `InlineEditSelect`
- Editable Notes column with `InlineEditNotes`

Currently it only has a read-only Notes column showing `user_notes` at lines 327-341.

### Solution
Add Contact Type column with inline editing after the Contact Name column, and replace the read-only Notes column with an editable version using `InlineEditNotes`.

**Files to modify:**
- `src/pages/contacts/BorrowerList.tsx`

**Changes:**
1. Add Contact Type column after Contact Name (around line 191) in the Pending Approval columns
2. Replace the read-only user_notes column (lines 327-341) with an editable `InlineEditNotes` component

---

## Issue 3: "Failed to update contact type" Error

### Problem
The `handleUpdateType` function at line 711-737 attempts to update with values like "Real Estate Agent" or "Lender", but the database enum `contact_type` has specific allowed values:
- Agent, Realtor, Borrower, Other, Real Estate Agent, Prospect, Third Party

The value "Lender" is NOT in the enum, causing the database update to fail.

### Solution
Update `CONTACT_TYPE_OPTIONS` to only use values that exist in the database enum:

**Current (incorrect):**
```typescript
const CONTACT_TYPE_OPTIONS = [
  { value: 'Borrower', label: 'Borrower' },
  { value: 'Real Estate Agent', label: 'Real Estate Agent' },
  { value: 'Lender', label: 'Lender' },      // NOT IN ENUM!
  { value: 'Other', label: 'Other' },
];
```

**Fixed:**
```typescript
const CONTACT_TYPE_OPTIONS = [
  { value: 'Borrower', label: 'Borrower' },
  { value: 'Real Estate Agent', label: 'Real Estate Agent' },
  { value: 'Agent', label: 'Agent' },
  { value: 'Third Party', label: 'Third Party' },
  { value: 'Prospect', label: 'Prospect' },
  { value: 'Other', label: 'Other' },
];
```

Also update `getContactTypeCategory` function to map database values properly for display.

---

## Issue 4: Notes Column Should Be Empty for User Input

### Problem
The notes column is showing auto-extracted data (from email parsing like "Extracted from email...") instead of being an empty field for custom user notes.

### Analysis
The contacts table has two relevant columns:
- `description`: Auto-extracted info from email parsing
- `user_notes`: Manual team notes (should be empty by default)

The current Notes column code at line 537 does:
```typescript
const notes = contact.user_notes || contact.notes || '';
```

This fallback to `contact.notes` (which may contain auto-data) is incorrect.

### Solution
Change the Notes column to only show `user_notes` without fallback:
```typescript
const notes = contact.user_notes || '';
```

This ensures the editable Notes column is empty for new contacts and only shows user-entered notes.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/contacts/BorrowerList.tsx` | Add Contact Type + editable Notes to Pending Approval columns; fix CONTACT_TYPE_OPTIONS enum values; fix notes fallback |
| `src/components/modals/ActivityLogModals.tsx` | Clean HTML entities and @mentions from content_preview |
| `src/components/lead-details/ActivityCommentSection.tsx` | Clean HTML entities and @mentions from content_preview |

---

## Technical Details

### Pending Approval Contact Type Column Addition
Insert this after the Contact Name column (around line 191):

```typescript
// Contact Type - editable for contacts table
columns.push({
  accessorKey: "contact_type",
  header: "Contact Type",
  cell: ({ row }) => {
    const contact = row.original;
    const contactType = getContactTypeCategory(contact);
    const isContactsTable = contact.source === 'contacts';
    
    if (isContactsTable && onUpdateType) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <InlineEditSelect
            value={contactType}
            options={CONTACT_TYPE_OPTIONS}
            onValueChange={(value) => {
              if (value) onUpdateType(contact.source_id, value);
            }}
            showClearOption={false}
          />
        </div>
      );
    }
    
    return (
      <Badge variant="outline" className="text-xs">
        {contactType}
      </Badge>
    );
  },
  sortable: true,
});
```

### Pending Approval Notes Column Replacement
Replace lines 327-341 with:

```typescript
// Notes (user_notes) - editable
columns.push({
  accessorKey: "user_notes",
  header: "Notes",
  cell: ({ row }) => {
    const contact = row.original;
    const isContactsTable = contact.source === 'contacts';
    const notes = contact.user_notes || '';
    
    if (isContactsTable && onUpdateNotes) {
      return (
        <div onClick={(e) => e.stopPropagation()} className="max-w-[200px]">
          <InlineEditNotes
            value={notes}
            onValueChange={(value) => onUpdateNotes(contact.source_id, value)}
            placeholder="Add notes..."
            maxLength={500}
          />
        </div>
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
        {notes || "—"}
      </div>
    );
  },
});
```

---

## Expected Results

1. **Mention notifications**: Will show clean text like `"This is a test."` without HTML entities or @mentions
2. **Pending Approval Contact Type**: Editable dropdown will appear after contact name
3. **Pending Approval Notes**: Editable text field will appear, initially empty for new contacts
4. **Contact Type updates**: Will save successfully using valid enum values
5. **Notes field**: Will be empty for user input, separate from auto-extracted description
