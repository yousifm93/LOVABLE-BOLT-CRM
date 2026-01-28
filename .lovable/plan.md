
# Plan: Fix Active Stage loan_status and Document Sync Issues

## Overview
Fix two issues: (1) loan_status not being set to 'NEW' when moving to Active stage through validation modal, and (2) ensure appraisal documents appear in all relevant sections regardless of where they're uploaded.

---

## Bug Analysis

### Bug 1: loan_status Not Set to 'NEW' When Moving to Active

**Root Cause:** The validation modal button handlers are missing the Active stage-specific logic.

When moving a lead to Active, validation requirements often trigger a modal. The "Save & Continue" and "Refinance Bypass" button handlers in that modal have duplicated stage-change code that's missing:

```typescript
// MISSING from both modal handlers:
const isActiveStage = normalizedLabel.toLowerCase() === 'active' || stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
if (isActiveStage) {
  updateData.pipeline_section = 'Incoming';
  updateData.loan_status = 'NEW';
}
```

### Bug 2: Appraisal Document Sync

Documents should appear in three places:
1. **Third Party Items > Appraisal** (shows `lead.appraisal_file`)
2. **Active File Documents > Appraisal Report** (shows `lead.appraisal_file`)
3. **Documents Tab** (shows records from `documents` table)

Currently, both upload locations create a `documents` record and update `appraisal_file`, but the Documents tab query may need to refresh.

---

## Implementation

### Fix 1: Add Active Stage Logic to Validation Modal Handlers

**File:** `src/components/ClientDetailDrawer.tsx`

**Change 1: Save & Continue button (around line 3329)**

Add Active stage handling after building the updateData:

```typescript
const stageUpdateData: any = { pipeline_stage_id: stageId };

// ... existing date field population code ...

// Add: Handle Active stage defaults
const isActiveStage = normalizedLabel.toLowerCase() === 'active' || 
  stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
if (isActiveStage) {
  stageUpdateData.pipeline_section = 'Incoming';
  stageUpdateData.loan_status = 'NEW';
}

await databaseService.updateLead(leadId!, stageUpdateData);
```

**Change 2: Refinance Bypass button (around line 3392)**

Add the same Active stage handling:

```typescript
const updateData: any = { pipeline_stage_id: stageId };

// ... existing date field population code ...

// Add: Handle Active stage defaults
const isActiveStage = normalizedLabel.toLowerCase() === 'active' || 
  stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
if (isActiveStage) {
  updateData.pipeline_section = 'Incoming';
  updateData.loan_status = 'NEW';
}

await databaseService.updateLead(leadId!, updateData);
```

---

### Fix 2: Ensure Document Sync Triggers Refresh

**File:** `src/components/lead-details/AppraisalTab.tsx`

Ensure that after uploading an appraisal, the parent's document list is refreshed. The current implementation calls `onUpdate` but may not trigger a documents refresh.

**Enhancement:** Call `onDocumentsChange` callback (if available) after creating the document record:

```typescript
// After line 79 (after creating document)
// If a documents refresh callback exists, call it
if (typeof onDocumentsChange === 'function') {
  onDocumentsChange();
}
```

This requires adding the optional prop to AppraisalTab if not already present.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ClientDetailDrawer.tsx` | Add Active stage handling (loan_status='NEW', pipeline_section='Incoming') to both validation modal button handlers |
| `src/components/lead-details/AppraisalTab.tsx` | (Optional) Add documents refresh callback after upload |

---

## Why This Fix Works

1. **Both code paths are covered:** Whether the user moves to Active directly (no validation) or through the validation modal, the loan_status will be set to 'NEW'

2. **Task automations will trigger:** Once loan_status is set to 'NEW', the database trigger `execute_pipeline_stage_changed_automations` will create the four associated tasks (Disclose, On-board, Call Borrower, Call Buyers Agent)

3. **Documents sync correctly:** Both AppraisalTab and ActiveFileDocuments already create `documents` table records. The fix ensures refresh callbacks properly update the UI

---

## Testing Checklist

After implementing:
1. Move a lead from Leads/Pre-Approved to Active via the pill tracker
2. Verify the validation modal appears (if requirements exist)
3. Click "Save & Continue" or use refinance bypass
4. Confirm lead appears in Active with loan_status = 'NEW'
5. Verify all 4 Active stage tasks are created
6. Upload an appraisal in Third Party Items - confirm it appears in Documents tab
7. Upload an appraisal in Active File Documents - confirm it shows in Third Party Items
