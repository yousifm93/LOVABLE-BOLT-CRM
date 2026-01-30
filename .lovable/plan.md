
# Plan: Fix CRM Issues & Enhance Condition Audit

## Summary of Issues Found

### Issue 1: Condition Audit Table Improvements
- **Missing "From" data**: Most conditions have `needed_from` as `NULL` in the database because:
  1. The create/edit condition form doesn't include a "Needed From" field
  2. Only AI-imported conditions have `needed_from` set (via parse-initial-approval function)
- **Condition names cut off**: The condition column has `truncate` and `max-w-[230px]` which cuts off long names
- **Missing columns**: Need to add File/Borrower column (already has Borrower and Loan #)

### Issue 2: Pipeline Stage Update Failures
- **Root cause**: Database trigger `trg_auto_complete_followup_screening` references non-existent column `completed_at` on tasks table
- **Error**: `column "completed_at" of relation "tasks" does not exist`
- **Impact**: Any update to leads table that would trigger the function fails silently

### Issue 3: Appraisal Status Auto-Flip Not Working
- **Current state**: `AppraisalTab.tsx` correctly sets status to "Received" on upload (lines 112-114)
- **Issue**: `ActiveFileDocuments.tsx` was updated to do the same (lines 487-496), but the toast message doesn't use the correct field names
- **Missing validation**: The validation in `Active.tsx` (lines 1211-1228) works, but only shows a toast - not a modal popup as requested

---

## Changes Required

### 1. Fix Condition Audit Table (`ConditionAuditTable.tsx`)

**A. Remove truncation from Condition column**
- Change `truncate max-w-[230px]` to allow full text display
- Increase column width from 250 to 400

**B. Handle "N/A" in From column**
- Already showing "N/A" when `needed_from` is null - this is correct since the data is missing

---

### 2. Add "Needed From" Field to Condition Create/Edit Form (`ConditionsTab.tsx`)

**Root cause fix**: The reason most conditions show "N/A" for "From" is that the condition creation form doesn't include a "Needed From" field.

**Changes:**
- Add `needed_from` to `formData` state (default to "Borrower")
- Add `needed_from` to `bulkConditions` structure
- Add "Needed From" Select field in the single condition form
- Add "Needed From" Select field in the bulk conditions form
- Include `needed_from` in the save function

---

### 3. Fix Database Trigger for Auto-Complete Tasks

**Problem**: Migration created trigger using non-existent `completed_at` column

**Fix**: Create corrected migration that:
1. Drops the broken trigger
2. Recreates the function without `completed_at` reference
3. Uses only columns that exist in tasks table (`status`, `updated_at`)

**Corrected SQL:**
```sql
CREATE OR REPLACE FUNCTION public.auto_complete_followup_on_screening()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid 
     AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    UPDATE tasks 
    SET status = 'Done',
        updated_at = NOW()
    WHERE borrower_id = NEW.id
      AND status != 'Done'
      AND deleted_at IS NULL
      AND (
        LOWER(title) LIKE '%follow up on pending app%'
        OR LOWER(title) LIKE '%follow up on new lead%'
      );
  END IF;
  RETURN NEW;
END;
$$;
```

---

### 4. Appraisal Status Validation Modal

**Current behavior**: Toast notification when trying to set status to "Received" without file

**Required behavior**: Modal popup that blocks the change

**Changes to `Active.tsx`:**
- Add state for showing a validation modal
- Replace the toast-only approach with modal display
- Import and use existing `StatusChangeRequirementModal` component

---

### 5. Refresh Data After Status Change in PendingApp

**Problem**: After changing status to "App Complete", the lead disappears from view but may not properly refresh

**Fix**: Ensure `fetchLeads()` is called after the update completes in `PendingApp.tsx`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/ConditionAuditTable.tsx` | Increase condition column width, remove truncation |
| `src/components/lead-details/ConditionsTab.tsx` | Add "Needed From" field to create/edit forms |
| `supabase/migrations/[new].sql` | Fix auto-complete trigger (remove completed_at) |
| `src/pages/Active.tsx` | Add modal for appraisal status validation |
| `src/pages/PendingApp.tsx` | Add data refresh after App Complete status change |

---

## Detailed Implementation

### ConditionAuditTable.tsx Changes

```typescript
// Line 162-172: Update condition column
{
  accessorKey: 'description',
  header: 'Condition',
  width: 400,  // Increased from 250
  cell: ({ row }) => (
    <div className="text-sm font-medium" title={row.original.description}>
      {row.original.description}  // Removed truncate and max-w
    </div>
  )
}
```

### ConditionsTab.tsx Changes

**1. Update formData state (line 145):**
```typescript
const [formData, setFormData] = useState({
  condition_type: "",
  description: "",
  status: "1_added",
  priority: "medium",
  due_date: "",
  notes: "",
  needed_from: "Borrower",  // NEW - default to Borrower
});
```

**2. Update bulkConditions structure (line 155):**
```typescript
const [bulkConditions, setBulkConditions] = useState<Array<{
  condition_type: string;
  description: string;
  status: string;
  due_date: string;
  priority: string;
  notes: string;
  needed_from: string;  // NEW
}>>([]);
```

**3. Add "Needed From" Select in single form (after Priority, ~line 1350):**
```typescript
<div>
  <label className="text-sm font-medium">Needed From</label>
  <Select
    value={formData.needed_from}
    onValueChange={(value) => setFormData({ ...formData, needed_from: value })}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {NEEDED_FROM_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**4. Add "Needed From" Select in bulk form (after Priority, ~line 1235):**
Same pattern as above but updating `bulkConditions[index].needed_from`

### Migration Fix

Create new migration to fix the broken trigger:

```sql
-- Fix auto-complete follow-up trigger (remove non-existent completed_at column)
CREATE OR REPLACE FUNCTION public.auto_complete_followup_on_screening()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid 
     AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    UPDATE tasks 
    SET status = 'Done',
        updated_at = NOW()
    WHERE borrower_id = NEW.id
      AND status != 'Done'
      AND deleted_at IS NULL
      AND (
        LOWER(title) LIKE '%follow up on pending app%'
        OR LOWER(title) LIKE '%follow up on new lead%'
      );
  END IF;
  RETURN NEW;
END;
$$;
```

### Active.tsx Modal Changes

**1. Add state for validation modal:**
```typescript
const [showAppraisalValidationModal, setShowAppraisalValidationModal] = useState(false);
const [pendingAppraisalUpdate, setPendingAppraisalUpdate] = useState<{id: string, value: string} | null>(null);
```

**2. Update handleUpdate to show modal instead of toast:**
```typescript
if (field === 'appraisal_status' && value === 'Received') {
  const { data: leadData } = await supabase
    .from('leads')
    .select('appraisal_file')
    .eq('id', id)
    .single();
  
  if (!leadData?.appraisal_file) {
    setPendingAppraisalUpdate({ id, value });
    setShowAppraisalValidationModal(true);
    return;  // Block the update
  }
}
```

**3. Add modal component in JSX:**
```typescript
<StatusChangeRequirementModal
  isOpen={showAppraisalValidationModal}
  onClose={() => setShowAppraisalValidationModal(false)}
  title="Appraisal Report Required"
  message="You cannot set appraisal status to 'Received' until an appraisal report is uploaded."
  fieldLabel="Appraisal Status"
  newValue="Received"
  rule={{
    requires: 'appraisal_file',
    message: 'Upload the appraisal report to change status to Received',
    actionLabel: 'Upload Appraisal Report',
    actionType: 'upload_file'
  }}
/>
```

### PendingApp.tsx Refresh Fix

**Add fetchLeads() call after App Complete update (line 446):**
```typescript
if (field === 'converted' && value === 'App Complete') {
  updateData.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995';
  updateData.app_complete_at = new Date().toISOString();
  updateData.converted = 'Just Applied';
  toast({
    title: "Moving to Screening",
    description: "Lead moved to Screening board with status 'Just Applied'",
  });
}

await databaseService.updateLead(id, updateData);

// Refresh data after status changes that move leads to other stages
if (field === 'converted' && value === 'App Complete') {
  await fetchLeads();  // NEW - refresh the list
}
```

---

## Expected Results After Fix

1. **Condition Audit**: Full condition names visible, "From" column works properly for new conditions
2. **Pipeline Stage Updates**: Moving leads between stages works correctly (trigger fixed)
3. **Appraisal Status**: Modal popup appears when trying to set status to "Received" without file
4. **Pending App to Screening**: Lead moves correctly and disappears from Pending App view
