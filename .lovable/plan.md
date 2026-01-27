
# Plan: Master Contact List Improvements

## Overview
Enhance the Master Contact List with several improvements to the pending approval workflow, contact detail dialog, and column organization.

---

## Summary of Changes

| Area | Change |
|------|--------|
| Tab Naming | Rename "From Emails" tab to "Pending Approval" |
| Pending Section | Split into two sub-groups: "With Phone Number" (priority) and "Email Only" |
| Column Order | Reorganize columns for better workflow |
| Column Header | Center "Contact Name" header text |
| Contact Dialog | Add editable Tags section with ability to add custom tags |
| Contact Dialog | Rename "Notes" to "Contact Source" (for auto-extracted info) |
| Contact Dialog | Add new editable "Notes" section for manual notes |
| Database | Add new `user_notes` column to store manual notes separately from auto-extracted notes |

---

## Detailed Implementation

### 1. Rename "From Emails" Tab to "Pending Approval"

**File:** `src/pages/contacts/BorrowerList.tsx`

Change the filter button array from `'From Emails'` to `'Pending Approval'`:
```typescript
// Line 680 - Update filter options
{['All', 'Borrower', 'Agent', 'Lender', 'Pending Approval', 'Other'].map(filter => (
```

Update the count display and filter logic to use `'Pending Approval'` instead of `'From Emails'`:
- Update `fromEmailsCount` to `pendingApprovalCount`
- Filter contacts with `approval_status === 'pending'` instead of just `source_type === 'email_import'`

---

### 2. Split Pending Approval into Two Sub-Groups

**File:** `src/pages/contacts/BorrowerList.tsx`

Within the "Pending Approval" collapsible section, create two nested sub-sections:

```text
v Pending Approval (32)
    v With Phone Number (12)  <- Priority group, shown first
        [Table with contacts that have both email AND phone]
    v Email Only (20)
        [Table with contacts that have email but NO phone]
```

**Logic:**
```typescript
// Split pending contacts into two groups
const pendingWithPhone = pendingContacts.filter(c => {
  const phone = c.phone?.replace(/\D/g, '') || '';
  return phone.length >= 10;
});

const pendingEmailOnly = pendingContacts.filter(c => {
  const phone = c.phone?.replace(/\D/g, '') || '';
  return phone.length < 10;
});
```

Both sub-groups will be collapsible, with "With Phone Number" expanded by default and "Email Only" collapsed.

---

### 3. Reorganize Column Order

**File:** `src/pages/contacts/BorrowerList.tsx`

New column order for the "Pending Approval" (formerly "From Emails") tab:
1. **Action** (approve/deny buttons)
2. **#** (row number)
3. **Contact Name** (centered header)
4. **Created On**
5. **Email**
6. **Phone**
7. **Company**
8. **Job Title**
9. **Duplicate?**
10. **Last Associated File**
11. **Tags**
12. **Description**
13. **Notes**
14. **Source Email** (moved to end - could show the email log reference)

Update `getColumns` function to:
- Reorder columns as specified
- Center the "Contact Name" header using `headerClassName: "text-center"`
- Move Source column to the end when in Pending Approval view

---

### 4. Center "Contact Name" Column Header

**File:** `src/pages/contacts/BorrowerList.tsx`

Update the name column definition:
```typescript
{
  accessorKey: "name",
  header: "Contact Name",
  headerClassName: "text-center",  // Add centering
  cell: ({ row }) => {
    // ... existing cell content
  },
}
```

---

### 5. Add Editable Tags Section to Contact Dialog

**File:** `src/components/ContactDetailDialog.tsx`

Create a new inline tag editor component that allows:
- Viewing existing tags
- Adding new custom tags (text input + Add button)
- Removing tags (X button on each tag badge)

```typescript
// New Tags section with add functionality
<div>
  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
    <Tag className="h-4 w-4" />
    Tags
  </h3>
  <div className="flex flex-wrap gap-2 mb-2">
    {(contact.tags || []).map((tag: string, index: number) => (
      <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
        {tag}
        <button onClick={() => handleRemoveTag(index)}>
          <X className="h-3 w-3" />
        </button>
      </Badge>
    ))}
  </div>
  <div className="flex gap-2">
    <Input 
      placeholder="Add new tag..." 
      value={newTag}
      onChange={(e) => setNewTag(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
    />
    <Button size="sm" onClick={handleAddTag}>Add</Button>
  </div>
</div>
```

**Handler functions:**
```typescript
const handleAddTag = async () => {
  if (!newTag.trim()) return;
  const updatedTags = [...(contact.tags || []), newTag.trim()];
  await handleFieldUpdate('tags', updatedTags);
  setNewTag('');
};

const handleRemoveTag = async (index: number) => {
  const updatedTags = (contact.tags || []).filter((_, i) => i !== index);
  await handleFieldUpdate('tags', updatedTags);
};
```

---

### 6. Rename "Notes" to "Contact Source" and Add Separate "Notes" Field

**Database Migration:**
Add a new column `user_notes` to the contacts table to store manual user notes, separate from the auto-extracted `notes` field:

```sql
ALTER TABLE contacts ADD COLUMN user_notes TEXT;
```

**File:** `src/components/ContactDetailDialog.tsx`

Rename the existing "Notes" section to "Contact Source" and make it read-only (for auto-extracted info):

```typescript
{/* Contact Source Section - auto-extracted, read-only */}
<div>
  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
    <FileText className="h-4 w-4" />
    Contact Source
  </h3>
  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
    {contact.notes || 'No source information'}
  </div>
</div>

{/* Notes Section - user-editable */}
<div>
  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
    <FileText className="h-4 w-4" />
    Notes
  </h3>
  <InlineEditNotes
    value={contact.user_notes}
    onValueChange={(value) => handleFieldUpdate('user_notes', value)}
    placeholder="Add notes about this contact..."
  />
</div>
```

---

### 7. Update Column Definitions for New Layout

**File:** `src/pages/contacts/BorrowerList.tsx`

Create a specialized `getPendingApprovalColumns` function with the exact column order:

```typescript
const getPendingApprovalColumns = (allContacts: any[], onApprove, onDeny): ColumnDef<any>[] => [
  // Action column (approve/deny)
  { accessorKey: "actions", header: "Action", ... },
  // Contact Name (centered)
  { accessorKey: "name", header: "Contact Name", headerClassName: "text-center", ... },
  // Created On
  { accessorKey: "created_at", header: "Created On", ... },
  // Email
  { accessorKey: "email", header: "Email", ... },
  // Phone
  { accessorKey: "phone", header: "Phone", ... },
  // Company
  { accessorKey: "company", header: "Company", ... },
  // Job Title
  { accessorKey: "job_title", header: "Job Title", ... },
  // Duplicate?
  { accessorKey: "is_duplicate", header: "Duplicate?", ... },
  // Last Associated File
  { accessorKey: "associated_lead", header: "Last Associated File", ... },
  // Tags
  { accessorKey: "tags", header: "Tags", ... },
  // Description
  { accessorKey: "description", header: "Description", ... },
  // Notes (user notes)
  { accessorKey: "user_notes", header: "Notes", ... },
  // Source Email (at end) - could link to the email_log
  { accessorKey: "source_email", header: "Source Email", ... },
];
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/contacts/BorrowerList.tsx` | Rename tab, split pending section, reorder columns, center header |
| `src/components/ContactDetailDialog.tsx` | Add editable tags, rename Notes to Contact Source, add user_notes field |
| Database migration | Add `user_notes` column to contacts table |

---

## Visual Representation

### Pending Approval Section (New Structure)
```text
v Pending Approval (32)
  |
  +-- v With Phone Number (12)  [Badge: green, "Priority"]
  |     [DataTable with contacts that have phone numbers]
  |
  +-- > Email Only (20)  [Collapsed by default]
        [DataTable with contacts without phone numbers]
```

### Contact Detail Dialog (New Layout)
```text
+----------------------------------+
| Avatar | Name                     |
|        | Company | Badge: Contact |
+----------------------------------+
| First Name     | Last Name        |
| Email          | Phone            |
| Company        | Job Title        |
| Created Date   | Last Contact     |
| Duplicate?     | Last Assoc. File |
+----------------------------------+
| Description (if exists)          |
+----------------------------------+
| Tags                             |
| [Tag1] [Tag2] [+Add new tag]     |
+----------------------------------+
| Contact Source                   |
| "Extracted from email: ..."      |
+----------------------------------+
| Notes                            |
| [Editable text area]             |
+----------------------------------+
```

### Column Order for Pending Approval Tab
```text
| Action | # | Contact Name | Created On | Email | Phone | Company | Job Title | Duplicate? | Last Assoc. File | Tags | Description | Notes | Source Email |
```
