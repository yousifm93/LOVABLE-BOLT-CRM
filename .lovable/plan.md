
# Comprehensive CRM Enhancement Plan

## Summary

This plan addresses 9 distinct features/fixes requested:

| # | Feature | Complexity |
|---|---------|------------|
| 1 | Fix AWC leads showing in Incoming instead of Live | Low |
| 2 | Add Condition Audit tab in Admin Settings | Medium |
| 3 | Add AUS Approval document type in Active File Documents | Low |
| 4 | Appraisal status auto-flip to "Received" + block manual changes | Medium |
| 5 | Move "About the Borrower" section for Pre-Qualified/Pre-Approved | Low |
| 6 | Task sorting - newest on top in Lead Details | Low |
| 7 | Task default status - blank instead of "Working on it" | Medium |
| 8 | Auto-complete follow-up tasks when lead moves to Screening | Medium |
| 9 | Active pipeline column alignment (Incoming/Live sections) | Low |

---

## Feature 1: Fix AWC Leads in Incoming Section

**Problem:** Lead with `loan_status = 'AWC'` (Gaurav Sharma) is still showing in Incoming section instead of Live.

**Root Cause:** When loan_status changes to AWC, the system should auto-move to Live section. The current logic only triggers when the change happens via UI interaction, not when the loan already has AWC status but is still in Incoming.

**Solution:**
1. Fix the initial data load to correctly place AWC leads in Live section
2. The filtering logic in `Active.tsx` already splits by `pipeline_section`, but leads set to AWC may not have had their `pipeline_section` updated

**Files to modify:**
- `src/pages/Active.tsx` - Update the section filtering to also check `loan_status` as fallback
- Create a one-time data fix SQL to update existing AWC leads that are in Incoming

**SQL Data Fix:**
```sql
UPDATE leads 
SET pipeline_section = 'Live' 
WHERE loan_status IN ('AWC', 'SUB', 'CTC') 
  AND pipeline_section = 'Incoming'
  AND deleted_at IS NULL;
```

---

## Feature 2: Condition Audit Tab in Admin

**Purpose:** Track all conditions added to files across the CRM for analysis and auditing.

**New Admin Tab Location:** Between "Field Management" and "Email Automations"

**Table Structure:** Use existing `lead_conditions` table with the following display columns:
- Condition Name (description)
- Borrower Name (from joined leads table)
- Loan Number (mb_loan_number from leads)
- From (needed_from field - Borrower/Third Party/etc.)
- Status
- Notes (editable)
- Created At
- Created By

**Files to create/modify:**
- `src/pages/Admin.tsx` - Add new "Condition Audit" tab
- `src/components/admin/ConditionAuditTable.tsx` (new) - DataTable component for conditions

**Features:**
- Filterable by date range, status, "From" category
- Searchable by condition name or borrower name
- Editable notes column for adding audit notes
- Click condition name to open lead in drawer
- Export to CSV capability

---

## Feature 3: Add AUS Approval Document

**Location:** Active File Documents section, between "Loan Estimate" and "Contract"

**Current order:**
1. Loan Estimate
2. Contract
3. Initial Approval
4. ...

**New order:**
1. Loan Estimate
2. AUS Approval (NEW)
3. Contract
4. Initial Approval
5. ...

**Files to modify:**
- `src/components/lead-details/ActiveFileDocuments.tsx` - Add `aus_approval_file` to FILE_FIELDS array

**Database:** The `aus_approval_file` column already exists in the leads table (as shown in FILE_FIELDS).

**Change:**
```typescript
const FILE_FIELDS = [
  { key: 'le_file', label: 'Loan Estimate' },
  { key: 'aus_approval_file', label: 'AUS Approval' },  // Moved here
  { key: 'contract_file', label: 'Contract' },
  { key: 'initial_approval_file', label: 'Initial Approval' },
  // ... rest
];
```

---

## Feature 4: Appraisal Status Auto-Flip + Block Manual Changes

**Requirements:**
1. When appraisal report is uploaded, automatically set `appraisal_status = 'Received'`
2. Block manual setting of appraisal_status to "Received" if no appraisal_file exists
3. Show popup if user tries to manually set to "Received" without uploaded report

**Current state:** 
- Status change validation already exists in `statusChangeValidation.ts` for appraisal_status = 'Received' requiring `appraisal_file`
- Appraisal upload in `AppraisalTab.tsx` already sets status to 'Received' when uploaded (line 112)

**Remaining work:**
1. Ensure `LeadThirdPartyItemsCard` appraisal upload also triggers status change
2. Add validation popup in `Active.tsx` when trying to change appraisal_status to 'Received' without file
3. Ensure `ActiveFileDocuments.tsx` appraisal upload triggers status change

**Files to modify:**
- `src/components/lead-details/LeadThirdPartyItemsCard.tsx` - Add auto-status-flip on appraisal upload
- `src/components/lead-details/ActiveFileDocuments.tsx` - Add auto-status-flip on appraisal upload
- `src/pages/Active.tsx` - Add validation modal for appraisal_status changes

**Status Validation Modal:** 
Reuse existing `StatusChangeRequirementModal` component to show "You cannot flip the appraisal status to 'Received' until an appraisal report is uploaded."

---

## Feature 5: Move "About the Borrower" for Pre-Qualified/Pre-Approved

**Current layout:**
- Pre-Qualified: "About the Borrower" in bottom right
- Pre-Approved: "About the Borrower" in bottom right

**Requested layout:**
- Pre-Qualified: "About the Borrower" in bottom left, under DTI/Address/PITI
- Pre-Approved: "About the Borrower" in bottom left, under DTI/Address/PITI

**Files to modify:**
- `src/components/ClientDetailDrawer.tsx` - Add "About the Borrower" section for pre-qualified and pre-approved stages in the left column (similar to screening implementation)

**Implementation:**
Add a new condition block after the DTI section (around line 2263) to render "About the Borrower" for pre-qualified and pre-approved stages:

```typescript
{/* About the Borrower - For Pre-Qualified/Pre-Approved in left column (below DTI) */}
{(opsStage === 'pre-qualified' || opsStage === 'pre-approved') && (
  <Card>...</Card>  // Same structure as screening
)}
```

Also remove the rendering of "About the Borrower" from the right column for these stages.

---

## Feature 6: Task Sorting - Newest on Top

**Current behavior:** Tasks in Lead Details drawer are sorted by:
1. Open tasks first (not Done)
2. Then by due date (earliest first)

**Requested behavior:** Newest tasks on top

**Files to modify:**
- `src/components/ClientDetailDrawer.tsx` - Update task sorting logic (around line 2561)

**New sort logic:**
```typescript
[...leadTasks].sort((a, b) => {
  // Open tasks (not Done) first
  if (a.status === 'Done' && b.status !== 'Done') return 1;
  if (a.status !== 'Done' && b.status === 'Done') return -1;
  // Then by created_at (newest first)
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
})
```

---

## Feature 7: Task Default Status - Blank Instead of "Working on it"

**Current behavior:** New tasks default to `status: "Working on it"`

**Requested behavior:** New tasks default to blank/null (no status selected)

**Problem:** The database column `tasks.status` is NOT NULL with enum constraints. We need to:
1. Add a new enum value for "Not Started" or "To Do" 
2. Or use "To Do" as the default (already exists in enum)

**Looking at the task_status enum values:** `To Do`, `Working on it`, `Done`

**Solution:** Change default status from "Working on it" to "To Do" (which represents "not started yet")

**Files to modify:**
- `src/components/modals/CreateTaskModal.tsx` - Change default status from "Working on it" to "To Do"
- `src/components/modals/CreateNextTaskModal.tsx` - Change default status
- Task automation trigger functions - Change default status
- `supabase/functions/trigger-task-automation/index.ts` - Change default status

**Note:** The user mentioned "blank" but since the field requires a value, "To Do" is the closest equivalent meaning "task exists but work hasn't started."

---

## Feature 8: Auto-Complete Follow-up Tasks on Screening Move

**Trigger:** When a lead moves to Screening stage (application complete)

**Action:** Auto-complete these specific tasks if they're still open:
- "Follow up on pending app"
- "Follow up on new lead"

**Reason:** No need to follow up if the borrower has already applied.

**Implementation approach:**
Create a database trigger or modify the lead update logic to:
1. Detect when `pipeline_stage_id` changes to Screening stage (`a4e162e0-5421-4d17-8ad5-4b1195bbc995`)
2. Find all open tasks for that lead with titles matching the follow-up tasks
3. Mark them as "Done"

**Files to create/modify:**
- Create new database migration with trigger function
- Alternative: Add logic to `ClientDetailDrawer.tsx` when stage changes

**SQL Trigger approach (preferred):**
```sql
CREATE OR REPLACE FUNCTION auto_complete_followup_on_screening()
RETURNS TRIGGER AS $$
BEGIN
  -- When moving TO Screening stage
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid 
     AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    UPDATE tasks 
    SET status = 'Done', 
        completed_at = NOW()
    WHERE borrower_id = NEW.id
      AND status != 'Done'
      AND deleted_at IS NULL
      AND (
        LOWER(title) LIKE '%follow up on pending app%'
        OR LOWER(title) LIKE '%follow up on new lead%'
        OR LOWER(task_name) LIKE '%follow up on pending app%'
        OR LOWER(task_name) LIKE '%follow up on new lead%'
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Feature 9: Active Pipeline Column Alignment

**Issue:** The Incoming and Live sections may have misaligned columns visually.

**Root cause:** Both sections use the same columns from `createColumns()`, but the header widths may not be consistent if data varies.

**Solution:** Both sections already use the same column definitions. The visual misalignment is likely due to:
1. Different scroll positions
2. Content width differences

**Fix:** Ensure both tables share the same column width state and use fixed widths.

**Files to modify:**
- `src/pages/Active.tsx` - Ensure column width consistency between sections

---

## Implementation Order

1. **Quick fixes first:**
   - Feature 3: Add AUS Approval document (simple array reorder)
   - Feature 6: Task sorting (simple sort change)
   - Feature 5: Move About the Borrower section
   
2. **Data fixes:**
   - Feature 1: AWC leads in wrong section (SQL fix + code adjustment)
   - Feature 9: Column alignment (CSS/width fixes)

3. **Logic changes:**
   - Feature 7: Task default status change
   - Feature 4: Appraisal status auto-flip and validation

4. **New features:**
   - Feature 2: Condition Audit tab (new component)
   - Feature 8: Auto-complete tasks on Screening (database trigger)

---

## Technical Details

### Database Changes

**Migration 1: Auto-complete follow-up tasks on Screening**
```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION public.auto_complete_followup_on_screening()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid 
     AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    UPDATE tasks 
    SET status = 'Done', 
        completed_at = NOW()
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

-- Create trigger
CREATE TRIGGER trg_auto_complete_followup_screening
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_followup_on_screening();
```

**Data Fix: Move AWC leads to Live**
```sql
UPDATE leads 
SET pipeline_section = 'Live' 
WHERE loan_status IN ('AWC', 'SUB', 'CTC') 
  AND pipeline_section = 'Incoming'
  AND deleted_at IS NULL;
```

### New Component: ConditionAuditTable

```typescript
// src/components/admin/ConditionAuditTable.tsx
interface ConditionAuditRow {
  id: string;
  description: string;
  lead_id: string;
  borrower_name: string;
  loan_number: string;
  needed_from: string;
  status: string;
  notes: string;
  created_at: string;
  created_by_name: string;
}

// DataTable with:
// - Date range filter
// - Status filter
// - "From" filter (Borrower, Third Party, etc.)
// - Search by condition name or borrower
// - Editable notes column
// - Click to open lead details
```

---

## Files Summary

| File | Action | Features |
|------|--------|----------|
| `src/pages/Admin.tsx` | Modify | Add Condition Audit tab (#2) |
| `src/components/admin/ConditionAuditTable.tsx` | Create | Condition Audit table (#2) |
| `src/components/lead-details/ActiveFileDocuments.tsx` | Modify | AUS Approval doc (#3), Appraisal auto-flip (#4) |
| `src/components/lead-details/LeadThirdPartyItemsCard.tsx` | Modify | Appraisal auto-flip (#4) |
| `src/components/ClientDetailDrawer.tsx` | Modify | About Borrower position (#5), Task sorting (#6) |
| `src/components/modals/CreateTaskModal.tsx` | Modify | Default status to "To Do" (#7) |
| `src/components/modals/CreateNextTaskModal.tsx` | Modify | Default status to "To Do" (#7) |
| `src/pages/Active.tsx` | Modify | AWC section fix (#1), Appraisal validation (#4), Column alignment (#9) |
| Database migration | Create | Auto-complete trigger (#8), AWC data fix (#1) |

