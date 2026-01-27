
## Plan: Fix Feedback Review Buckets, Active Status, Modal Width, Conditions Scroll, and Note Image Upload

### Overview

This plan addresses 5 distinct issues:

1. **Feedback Review - Two Buckets Only** - Simplify to just "Open" (top) and "Complete" (bottom collapsed)
2. **Active Stage Not Setting Status to "New"** - Investigate pipeline move from table vs drawer
3. **Likely to Apply Modal Width** - Increase modal size so dropdown is fully visible
4. **Conditions Modal Scroll + Width** - Fix scroll and expand horizontally for more columns
5. **Note Image Upload "Failed to add note"** - Fix duplicate key constraint error in storage upload

---

### Issue 1: Feedback Review - Only Two Buckets

**User Request (Clarified)**:
- **Top Bucket (Always Expanded)**: Everything that's NOT complete (Open, Needs Help, Ideas, Pending Review)
- **Bottom Bucket (Collapsed by Default)**: Everything that IS Complete

**Current Problem**: The page shows every feedback entry as a separate card/accordion, creating a long list. User wants just 2 global buckets across ALL feedback.

**Root Cause**: The current structure iterates over each feedback entry and shows Open/Pending Review/Complete sections within EACH card.

**Solution**: Restructure the page to:
1. Create TWO global collapsible sections at the top level
2. "Open Items" section at top - groups all non-complete items across all feedback entries
3. "Completed Items" section at bottom - groups all complete items across all feedback entries (collapsed by default)

**File to Modify**: `src/pages/admin/FeedbackReview.tsx`

**Key Changes**:
```typescript
// Instead of rendering per-feedback-entry, aggregate all items:
const allOpenItems: Array<{fb: FeedbackItem; item: FeedbackItemContent | string; index: number}> = [];
const allCompletedItems: Array<{fb: FeedbackItem; item: FeedbackItemContent | string; index: number}> = [];

userFeedback.forEach(fb => {
  fb.feedback_items.forEach((item, index) => {
    const status = getItemStatus(fb.id, index);
    if (status === 'complete') {
      allCompletedItems.push({ fb, item, index });
    } else {
      allOpenItems.push({ fb, item, index });
    }
  });
});

// Render two buckets:
// 1. Open Items (always expanded, shows count)
// 2. Completed Items (collapsed by default, shows count)
```

---

### Issue 2: Active Stage Not Setting Status to "New"

**Current Behavior**: When moving a lead to Active from the Leads table (not drawer), the `loan_status` is not being set to "New".

**Analysis**: The code in `ClientDetailDrawer.tsx` lines 1557-1564 correctly sets `loan_status = 'NEW'` when:
- The dropdown in the drawer is used (calls `handleStageChange`)
- Uses both label and UUID check

**Possible Causes**:
1. If moving from DataTable directly, a different code path might be used
2. The new lead "This is a test" was moved from Leads page, which may use a different handler

**Investigation Needed**: Search for where leads are moved from the table view:

**Solution**: Check and add the same Active stage logic to:
- Any DataTable row actions that move pipeline stages
- Any bulk move operations
- The `InlineEditSelect` component for pipeline_stage if used in table

**Files to Check**:
- `src/pages/LeadsModern.tsx` - Look for pipeline move handlers
- `src/pages/Leads.tsx` - Look for pipeline move handlers
- Any inline edit component for pipeline_stage

---

### Issue 3: Likely to Apply Modal Width

**Problem**: The "Action Required" modal that appears when moving to Pending App doesn't show the "Likely to Apply" dropdown fully - it's cut off at the bottom.

**Current State**: The modal uses `max-w-md` (line 3177 in ClientDetailDrawer.tsx would be where it's defined, but the DialogContent was at line ~3179).

**Solution**: Increase the modal width from `max-w-md` to `max-w-lg` (or `max-w-xl`) to give more room for the form fields.

**File to Modify**: `src/components/ClientDetailDrawer.tsx`

**Change**:
```typescript
// Find the DialogContent for pipelineValidationModalOpen
// Change max-w-md to max-w-lg
<DialogContent className="max-w-lg">
```

---

### Issue 4: Conditions Modal - Scroll and Horizontal Expansion

**Problems**:
1. Cannot scroll to see all conditions (user sees 21 conditions but can't scroll)
2. Need to expand horizontally to add columns: ETA, Responsible person, Borrower/Lender

**Current State**: 
- Modal has `max-w-4xl max-h-[85vh]`
- ScrollArea has `max-h-[60vh]`
- Each condition row only shows description and phase/underwriter

**Solution**:

**A. Fix Scrolling**:
- Ensure ScrollArea has proper flex behavior
- Remove overflow-hidden from parent if present
- The issue may be that the DialogContent is intercepting scroll events

**B. Horizontal Expansion**:
- Change modal to `max-w-6xl` or full width
- Add additional columns to each condition row:
  - ETA (input or date picker)
  - Responsible (select: Borrower, Lender, Broker, Title, etc.)
  - Type (Borrower vs Lender condition)

**File to Modify**: `src/components/modals/InitialApprovalConditionsModal.tsx`

**Changes**:
```typescript
// Increase modal width
<DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">

// Update ScrollArea height
<ScrollArea className="flex-1 min-h-0 pr-4">

// Add new columns to each condition row:
<div className="grid grid-cols-12 gap-2 items-start">
  <div className="col-span-1">
    <Checkbox ... />
  </div>
  <div className="col-span-5">
    <Input value={description} ... />
  </div>
  <div className="col-span-2">
    <Select placeholder="Responsible">
      <SelectItem value="borrower">Borrower</SelectItem>
      <SelectItem value="lender">Lender</SelectItem>
      <SelectItem value="broker">Broker</SelectItem>
      <SelectItem value="title">Title</SelectItem>
    </Select>
  </div>
  <div className="col-span-2">
    <Input type="date" placeholder="ETA" />
  </div>
  <div className="col-span-2">
    <span className="text-xs">Phase: {phase}</span>
  </div>
</div>
```

---

### Issue 5: Note Image Upload Fails

**Error**: "Upload Failed. Could not upload the image. Please try again."

**Root Cause**: Database logs show:
```
duplicate key value violates unique constraint "bucketid_objname"
```

This means the storage upload path collides with an existing file. The current path is:
```typescript
const filePath = `activity-attachments/${leadId}/${Date.now()}_${file.name}`;
```

**Problem**: If two uploads happen in the same millisecond, or if the user retries quickly, the path can collide.

**Solution**: Add a random suffix to ensure uniqueness:

**File to Modify**: `src/components/modals/ActivityLogModals.tsx`

**Change** (around line 740):
```typescript
// Before:
const filePath = `activity-attachments/${leadId}/${Date.now()}_${file.name}`;

// After:
const randomSuffix = Math.random().toString(36).substring(2, 8);
const filePath = `activity-attachments/${leadId}/${Date.now()}_${randomSuffix}_${file.name}`;
```

Also, add upsert option to handle duplicates gracefully:
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload(filePath, file, { upsert: true });  // Add upsert option
```

---

### Summary of All Changes

| Issue | File | Change |
|-------|------|--------|
| 1. Feedback Buckets | `src/pages/admin/FeedbackReview.tsx` | Restructure to 2 global buckets: Open (top) and Complete (bottom collapsed) |
| 2. Active Status | Multiple files | Ensure all pipeline move paths set `loan_status = 'NEW'` for Active |
| 3. Modal Width | `src/components/ClientDetailDrawer.tsx` | Change validation modal to `max-w-lg` |
| 4. Conditions Modal | `src/components/modals/InitialApprovalConditionsModal.tsx` | Expand to `max-w-6xl`, fix scroll, add ETA/Responsible columns |
| 5. Image Upload | `src/components/modals/ActivityLogModals.tsx` | Add random suffix to file path + upsert option |

---

### Technical Implementation Order

1. **ActivityLogModals.tsx** - Fix image upload (quick fix for immediate issue)
2. **ClientDetailDrawer.tsx** - Increase modal width for Likely to Apply
3. **InitialApprovalConditionsModal.tsx** - Fix scroll and expand with new columns
4. **FeedbackReview.tsx** - Restructure to two global buckets
5. **Pipeline move handlers** - Verify Active stage sets loan_status

---

### Expected Outcomes

After implementation:
- Feedback Review shows 2 clean buckets: Open at top, Complete (collapsed) at bottom
- Moving to Active always sets loan_status to "New" regardless of how move is initiated
- "Likely to Apply" dropdown is fully visible in the validation modal
- Initial Approval Conditions modal scrolls properly and has columns for ETA, Responsible person
- Note image attachments upload successfully without duplicate key errors
