
## Plan: Fix Conditions RLS, Feedback Review Bucketing, Conditions Modal Scrolling, and Activity Image Attachments

### Overview

This plan addresses 5 distinct issues:

1. **Conditions RLS Error** - Users can't add conditions to leads with mismatched account_id
2. **Feedback Review Bucketing** - Reorganize sections into proper collapsible folders/buckets
3. **Initial Approval Modal** - Fix scroll and enable editing condition names
4. **Activity Log Image Attachments** - Allow attaching images to notes/calls/SMS logs
5. **Conditions Insertion Error** - Modal shows "Failed to create conditions" error

---

### Issue 1: Conditions RLS Error

**Problem**: The lead "Rakesh Lakkimsetty" has `account_id: 2b0a4642-5c1c-4d81-814f-7735df3f11f3` but Ashley and Yousif are associated with `account_id: 47e707c5-62d0-4ee9-99a3-76572c73a8e1`. The RLS policy on `lead_conditions` checks that the lead's `account_id` matches the user's `account_id`.

**Solution**: Fix the lead's account_id to match the team's account_id.

**Database Fix (via SQL run in Supabase Dashboard)**:
```sql
-- Update Rakesh's lead to use the correct team account_id
UPDATE leads 
SET account_id = '47e707c5-62d0-4ee9-99a3-76572c73a8e1' 
WHERE id = '2e66a1f4-5378-43b8-80e2-cdf591299626';
```

**Prevention**: The `set_lead_defaults()` trigger function should correctly set `account_id` on new leads using `get_user_account_id(auth.uid())`. If leads are being created with wrong account_ids, we may need to debug that trigger.

---

### Issue 2: Feedback Review - Collapsible Buckets/Folders

**User Request**:
- **Top (Always Open)**: Open/Still Needs Help items (no status or `needs_help`)
- **Below That**: Pending User Review (collapsible)
- **Bottom (Collapsed by default)**: Complete section

**Current State**: Already partially implemented but needs tweaking:
1. Ideas (`idea` status) should be grouped with Open, not separate
2. Complete section should be **collapsed by default**
3. Clear visual separation between buckets

**File to Modify**: `src/pages/admin/FeedbackReview.tsx`

**Changes**:
1. Initialize `completedSectionsOpen` to `false` by default (currently not initialized)
2. Initialize `pendingReviewSectionsOpen` to `false` by default
3. Add visual card/border to each bucket section for better grouping
4. Ensure Open items (pending + needs_help + idea) are always expanded and visible

**Code Changes**:
```typescript
// In useEffect after fetching data, initialize collapse states
const initialCompletedOpen: Record<string, boolean> = {};
const initialPendingReviewOpen: Record<string, boolean> = {};
feedbackData?.forEach(f => {
  initialCompletedOpen[f.id] = false;  // Complete collapsed by default
  initialPendingReviewOpen[f.id] = false; // Pending review collapsed by default
});
setCompletedSectionsOpen(initialCompletedOpen);
setPendingReviewSectionsOpen(initialPendingReviewOpen);
```

---

### Issue 3: Initial Approval Conditions Modal - Scroll & Edit

**Problems**:
1. Can't scroll to see all conditions in the modal
2. Can't edit condition names/descriptions before saving
3. Error "Failed to create conditions" when trying to add

**Root Cause Analysis**:
- The modal at `src/components/modals/InitialApprovalConditionsModal.tsx` already has a `ScrollArea` with `max-h-[50vh]` (line 167)
- However, the modal content might be overflowing; need to increase scroll area height
- The conditions are not editable - just checkboxes for selection
- The insertion error is likely the same RLS issue as #1

**Files to Modify**: `src/components/modals/InitialApprovalConditionsModal.tsx`

**Changes**:
1. Increase `max-h-[50vh]` to `max-h-[60vh]` for more scroll space
2. Add editable input fields for each condition description
3. Store edited conditions in local state before submission

**Code Changes**:

```typescript
// Add state for editable conditions
const [editedConditions, setEditedConditions] = useState<Map<number, string>>(new Map());

// Update condition description
const handleDescriptionChange = (index: number, value: string) => {
  setEditedConditions(prev => new Map(prev).set(index, value));
};

// Get final description (edited or original)
const getFinalDescription = (index: number, original: string) => {
  return editedConditions.get(index) ?? original;
};

// In the condition item render, replace static text with input:
<Input
  value={getFinalDescription(index, condition.description)}
  onChange={(e) => handleDescriptionChange(index, e.target.value)}
  className="text-sm"
/>
```

Also update `handleConfirm` to use edited descriptions:
```typescript
const handleConfirm = () => {
  const selected = conditions.filter((_, i) => selectedIndices.has(i)).map((c, i) => ({
    ...c,
    description: getFinalDescription(conditions.indexOf(c), c.description)
  }));
  onConfirm(selected);
};
```

---

### Issue 4: Activity Log Image Attachments

**User Request**: Attach images to notes, call logs, and SMS logs so they can be viewed when reviewing the activity.

**Current State**:
- `notes` table: `id`, `lead_id`, `author_id`, `body`, `created_at` - **No image column**
- `call_logs` table: `id`, `lead_id`, `user_id`, `timestamp`, `outcome`, `duration_seconds`, `notes`, `created_at` - **No image column**
- `sms_logs` table: Same - **No image column**

**Solution**: Add `attachment_url` column to relevant tables and add image upload UI to modals.

**Database Migration**:
```sql
-- Add attachment_url columns
ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS attachment_url TEXT;
```

**Files to Modify**:
- `src/components/modals/ActivityLogModals.tsx` - Add file upload button to `AddNoteModal`, `CallLogModal`, `SmsLogModal`
- `src/services/database.ts` - Update types and insert functions

**UI Changes for AddNoteModal**:
```typescript
// Add state for attachment
const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);

// File upload handler
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setUploading(true);
  try {
    // Upload to documents storage bucket
    const filePath = `activity-attachments/${leadId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);
    
    setAttachmentUrl(publicUrl);
    toast({ title: "Image Uploaded", description: "Attachment ready to save with note." });
  } catch (error) {
    toast({ title: "Upload Failed", variant: "destructive" });
  } finally {
    setUploading(false);
  }
};

// Update submit to include attachment_url
const noteData = {
  lead_id: leadId,
  author_id: crmUser.id,
  body: noteBody.trim(),
  attachment_url: attachmentUrl,
};
```

**UI Component**:
```tsx
<div className="space-y-2">
  <Label>Attachment (optional)</Label>
  <div className="flex items-center gap-2">
    <Input
      type="file"
      accept="image/*"
      onChange={handleFileUpload}
      disabled={uploading}
    />
    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
  </div>
  {attachmentUrl && (
    <img src={attachmentUrl} alt="Preview" className="max-h-32 rounded-md" />
  )}
</div>
```

**Display in Activity Tab**:
When rendering notes in activity timeline, display the attachment if present:
```tsx
{note.attachment_url && (
  <a href={note.attachment_url} target="_blank" rel="noopener noreferrer">
    <img 
      src={note.attachment_url} 
      alt="Attachment" 
      className="max-h-48 rounded-md mt-2 cursor-pointer hover:opacity-80"
    />
  </a>
)}
```

---

### Issue 5: Conditions Insertion Error

**Problem**: "Failed to create conditions" error when using the Initial Approval modal.

**Root Cause**: Same RLS issue as #1 - the user's `account_id` doesn't match the lead's `account_id`.

**Solution**: 
1. Fix Rakesh's `account_id` (covered in Issue #1)
2. Add better error handling to show the actual RLS error message to help diagnose future issues

**File to Modify**: `src/components/lead-details/ConditionsTab.tsx` and wherever the Initial Approval conditions are imported

**Change** in error handling:
```typescript
} catch (error: any) {
  console.error("Error creating bulk conditions:", error);
  toast({
    title: "Error",
    description: error?.message || "Failed to create conditions",
    variant: "destructive",
  });
}
```

This is already implemented; the issue is purely the RLS mismatch on the lead's account_id.

---

### Summary of All Changes

| Issue | Type | Change |
|-------|------|--------|
| 1. Conditions RLS | Data Fix | Update Rakesh's lead `account_id` to team account |
| 2. Feedback Buckets | Code | Initialize collapsed states, add visual separation |
| 3. Modal Scroll/Edit | Code | Increase scroll height, add editable inputs |
| 4. Image Attachments | Schema + Code | Add `attachment_url` column, add upload UI |
| 5. Conditions Error | Data Fix | Same as #1 - RLS mismatch |

---

### Technical Implementation Order

1. **Data Fix (Manual SQL)** - Fix Rakesh's account_id
2. **SQL Migration** - Add `attachment_url` columns to notes/call_logs/sms_logs
3. **FeedbackReview.tsx** - Initialize collapse states, visual buckets
4. **InitialApprovalConditionsModal.tsx** - Increase scroll height, add editable fields
5. **ActivityLogModals.tsx** - Add file upload UI to note/call/SMS modals
6. **ActivityTab.tsx** - Display attachments in activity timeline

---

### Expected Outcomes

After implementation:
- Users can add conditions to all leads (RLS fixed)
- Feedback Review has clear buckets: Open (top) → Pending Review (collapsed) → Complete (collapsed at bottom)
- Initial Approval modal scrolls properly and allows editing condition names
- Notes/Calls/SMS can include image attachments that display inline
