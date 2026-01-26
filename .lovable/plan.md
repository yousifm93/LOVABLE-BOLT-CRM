
## Implementation Plan: Comprehensive CRM Feature Enhancements

This plan covers 5 main feature areas based on your requirements:

1. **@Mentions everywhere in the CRM** - Enable tagging team members in all note/comment fields with email notifications
2. **Past Clients columns** - Add Final CD, Appraisal, and Client Rating columns
3. **Lender file attachments** - Add file upload section to lender detail view
4. **Idle stage improvements** - Add "Idle On" date column and grouping by future steps

---

### 1. Enable @Mentions Throughout the CRM

**Current State**: The `MentionableRichTextEditor` component already exists and works in:
- Activity Log notes
- Activity comments on timeline items

**Problem**: Most other note/text fields use either `InlineEditNotes` (plain textarea) or `RichTextEditor` (no mention support).

**Solution**: Create a new `MentionableInlineEditNotes` component that combines the editing behavior of `InlineEditNotes` with the mention capabilities of `MentionableRichTextEditor`.

**Files to Create/Modify**:

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/mentionable-inline-edit-notes.tsx` | Create | New component combining inline edit with mentions |
| `src/components/lead-details/TitleTab.tsx` | Modify | Replace `InlineEditNotes` with mentionable version |
| `src/components/lead-details/InsuranceTab.tsx` | Modify | Replace `InlineEditNotes` with mentionable version |
| `src/components/lead-details/CondoTab.tsx` | Modify | Replace `InlineEditNotes` with mentionable version |
| `src/components/ContactDetailDialog.tsx` | Modify | Replace notes field with mentionable version |
| `src/components/AgentDetailDrawer.tsx` | Modify | Replace notes field with mentionable version |
| `src/components/LenderDetailDialog.tsx` | Modify | Replace notes fields with mentionable versions |
| `src/components/LenderDetailDrawer.tsx` | Modify | Replace notes field with mentionable version |
| `src/pages/TasksModern.tsx` | Modify | Replace task notes with mentionable version |

**Technical Approach**:
```typescript
// New component: MentionableInlineEditNotes
interface MentionableInlineEditNotesProps {
  value: string | null;
  onValueChange: (value: string) => void;
  onMentionsDetected?: (mentions: TeamMember[]) => void;
  contextType: 'lead' | 'lender' | 'agent' | 'contact' | 'task';
  contextId: string;
  contextName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// On save, parse HTML for data-user-id attributes
// Send mention notifications via send-mention-notification edge function
```

---

### 2. Past Clients New Columns

**Current State**: The Past Clients page displays loans but lacks document reference columns and client rating.

**Database Changes Required**:
- Add `client_rating` column to `leads` table (VARCHAR with A-F options)

**Note**: `fcp_file` (Final Closing Package = Final CD) and `appraisal_file` already exist in the leads table.

**Files to Modify**:

| File | Changes |
|------|---------|
| `src/pages/PastClients.tsx` | Add 3 new columns: Final CD, Appraisal, Client Rating |

**New Columns Implementation**:

```typescript
// Final CD column - uses existing fcp_file field
{
  accessorKey: "fcp_file",
  header: "Final CD",
  cell: ({ row }) => (
    <FileUploadButton
      value={row.original.fcp_file}
      onUpload={(url) => handleUpdate(row.original.id, "fcp_file", url)}
      bucket="documents"
      storagePath={`past-clients/${row.original.id}/final-cd`}
    />
  ),
}

// Appraisal column - uses existing appraisal_file field
{
  accessorKey: "appraisal_file",
  header: "Appraisal",
  cell: ({ row }) => (
    <FileUploadButton
      value={row.original.appraisal_file}
      onUpload={(url) => handleUpdate(row.original.id, "appraisal_file", url)}
      bucket="documents"
      storagePath={`past-clients/${row.original.id}/appraisal`}
    />
  ),
}

// Client Rating column - NEW field
{
  accessorKey: "client_rating",
  header: "Rating",
  cell: ({ row }) => (
    <InlineEditSelect
      value={row.original.client_rating}
      options={[
        { value: "A", label: "A" },
        { value: "B", label: "B" },
        { value: "C", label: "C" },
        { value: "D", label: "D" },
        { value: "F", label: "F" },
      ]}
      onValueChange={(value) => handleUpdate(row.original.id, "client_rating", value)}
      showAsStatusBadge
    />
  ),
}
```

**Database Migration**:
```sql
ALTER TABLE leads ADD COLUMN client_rating TEXT;
```

---

### 3. Lender File Attachments

**Current State**: Lenders have notes, clauses, and email history but no file attachment capability.

**Database Changes Required**:
- Create new `lender_documents` table for file attachments

**Files to Create/Modify**:

| File | Action | Description |
|------|--------|-------------|
| `src/components/LenderDetailDialog.tsx` | Modify | Add file upload section above Email History |
| `src/components/LenderDetailDrawer.tsx` | Modify | Add file upload section above Notes |
| `src/services/database.ts` | Modify | Add lender document CRUD operations |

**Database Schema**:
```sql
CREATE TABLE lender_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID REFERENCES lenders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE lender_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can view lender documents"
  ON lender_documents FOR SELECT
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert lender documents"
  ON lender_documents FOR INSERT
  WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can update lender documents"
  ON lender_documents FOR UPDATE
  USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can delete lender documents"
  ON lender_documents FOR DELETE
  USING (is_team_member(auth.uid()));
```

**UI Component**:
```typescript
// New section in LenderDetailDialog, above Email History
<div>
  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
    <Paperclip className="h-4 w-4" />
    Files ({lenderDocuments.length})
  </h3>
  <LenderFilesSection 
    lenderId={lender.id} 
    onFilesChange={fetchLenderDocuments}
  />
</div>
```

Features:
- Drag and drop file upload
- File preview (PDF inline, images in modal)
- Download button
- Delete with confirmation
- Shows file type icon, name, size, upload date

---

### 4. Idle Stage Improvements

**Current State**: Idle page shows leads with basic info but lacks "moved to idle" timestamp and grouping.

**Database Changes Required**:
- Add `idle_moved_at` column to `leads` table (TIMESTAMPTZ)
- Create trigger to auto-set `idle_moved_at` when pipeline_stage_id changes to idle

**Files to Modify**:

| File | Changes |
|------|---------|
| `src/pages/Idle.tsx` | Add "Idle On" column, add grouping by Future Steps |

**Database Migration**:
```sql
-- Add column
ALTER TABLE leads ADD COLUMN idle_moved_at TIMESTAMPTZ;

-- Create trigger to auto-populate
CREATE OR REPLACE FUNCTION set_idle_moved_at()
RETURNS TRIGGER AS $$
BEGIN
  -- When moving TO idle stage
  IF NEW.pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'::uuid 
     AND (OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id) THEN
    NEW.idle_moved_at = NOW();
  END IF;
  -- When moving OUT OF idle stage, clear the timestamp
  IF OLD.pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'::uuid 
     AND NEW.pipeline_stage_id != '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'::uuid THEN
    NEW.idle_moved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_idle_moved_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION set_idle_moved_at();
```

**UI Changes**:

```typescript
// New column for Idle On
{
  accessorKey: "idle_moved_at",
  header: "Idle On",
  cell: ({ row }) => (
    <span className="text-sm text-muted-foreground">
      {row.original.idle_moved_at 
        ? formatDateShort(row.original.idle_moved_at) 
        : '—'}
    </span>
  ),
  sortable: true,
}

// Grouping by Future Steps
// Add CollapsiblePipelineSection for each group:
// - "Has Future Steps" (idle_future_steps = true)
// - "No Future Steps" (idle_future_steps = false or null)
```

**Grouping Implementation**:
```typescript
const leadsWithFutureSteps = filteredLeads.filter(l => l.idle_future_steps === true);
const leadsWithoutFutureSteps = filteredLeads.filter(l => l.idle_future_steps !== true);

// Render two CollapsiblePipelineSection components
<CollapsiblePipelineSection
  title="Has Future Steps"
  count={leadsWithFutureSteps.length}
  defaultOpen={true}
>
  <DataTable columns={columns} data={leadsWithFutureSteps} ... />
</CollapsiblePipelineSection>

<CollapsiblePipelineSection
  title="No Future Steps"
  count={leadsWithoutFutureSteps.length}
  defaultOpen={true}
>
  <DataTable columns={columns} data={leadsWithoutFutureSteps} ... />
</CollapsiblePipelineSection>
```

---

### Implementation Order

1. **Database migrations first** (all schema changes)
   - Add `client_rating` to leads
   - Add `idle_moved_at` to leads + trigger
   - Create `lender_documents` table + RLS

2. **Lender file attachments** (self-contained feature)
   - Create table, add UI section to LenderDetailDialog

3. **Past Clients columns** (uses existing file fields + new rating)
   - Add 3 columns to PastClients.tsx

4. **Idle stage improvements** (date column + grouping)
   - Add column and grouping logic to Idle.tsx

5. **@Mentions everywhere** (larger refactor)
   - Create MentionableInlineEditNotes component
   - Replace InlineEditNotes in 8+ files
   - Test email notifications

---

### Summary of Database Changes

| Table | Column/Object | Type | Purpose |
|-------|---------------|------|---------|
| `leads` | `client_rating` | TEXT | A-F rating for past clients |
| `leads` | `idle_moved_at` | TIMESTAMPTZ | When lead moved to idle |
| `lender_documents` | New table | - | Store lender file attachments |
| `set_idle_moved_at()` | Trigger function | - | Auto-set idle timestamp |

### Summary of File Changes

| Category | Files Modified | New Files |
|----------|----------------|-----------|
| Mentions | 9 files | 1 component |
| Past Clients | 1 file | 0 |
| Lender Files | 2 files | 0 |
| Idle | 1 file | 0 |
| Database | database.ts | 1 migration |
