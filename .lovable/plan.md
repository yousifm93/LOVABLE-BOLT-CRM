
# Plan: Task Completion Validation and New Automated Tasks

## Summary
This plan addresses:
1. **Disclosure document task cannot be manually completed** - requires uploading the disclosure doc first, then auto-completes
2. **New task automations** - 3 new automations triggered by AWC and disclosure status changes
3. **Complex completion requirements** - for Order Title and Order Condo tasks

---

## Part 1: Disclosure Document Task - Block Manual Completion + Auto-Complete

### Current State
- A task "Upload disclosure document" is created when `disclosure_status = Sent` (automation ID: `b33fd14f-4e26-4572-9790-317e808bf201`)
- It has `completion_requirement_type: field_populated:disc_file`
- This blocks manual completion until `disc_file` is uploaded ✓
- However, users CAN still manually mark as Done after uploading

### Desired State
- Task should NEVER be manually completable
- Task should auto-complete ONLY when `disc_file` is populated
- A popup should explain this to users

### Implementation

**A. Update taskCompletionValidation.ts**
Add a new check for tasks that should ONLY be auto-completed (never manually):

```typescript
// Check for auto-complete-only tasks (cannot be manually completed)
if (requirementType === 'auto_complete_only:field_populated:disc_file' || 
    (task.title?.toLowerCase().includes('upload disclosure') && requirementType?.includes('disc_file'))) {
  const borrowerId = task.borrower_id;
  if (borrowerId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('disc_file')
      .eq('id', borrowerId)
      .single();

    // If disc_file is NOT uploaded, block completion
    if (!lead?.disc_file) {
      return {
        canComplete: false,
        message: 'Please upload the disclosure document under the Disclosures tab first. This task will auto-complete once the document is uploaded.',
        missingRequirement: 'auto_complete_disc_file',
      };
    }
    // If disc_file IS uploaded, still block MANUAL completion - it should only auto-complete
    return {
      canComplete: false,
      message: 'This task is auto-completed when the disclosure document is uploaded. It cannot be manually completed.',
      missingRequirement: 'manual_completion_blocked',
    };
  }
}
```

**B. Update the automation's completion_requirement_type**
Change from `field_populated:disc_file` to `auto_complete_only:disc_file` to indicate it can ONLY be auto-completed.

**C. Update TaskCompletionRequirementModal.tsx**
Add a case to show appropriate UI for auto-complete-only tasks with a button to navigate to the Disclosures section.

**D. Ensure auto-completion is triggered**
When `disc_file` is updated on a lead, the `autoCompleteTasksAfterFieldUpdate` function is called. We need to ensure:
1. Tasks with `auto_complete_only:disc_file` are matched
2. The task is marked as Done automatically

---

## Part 2: New Task Automations

### Automation 1: Borrower Intro Call (AWC)
| Field | Value |
|-------|-------|
| Trigger | When `loan_status` changes to `AWC` |
| Task Name | Borrower intro call |
| Description | Call the borrower to introduce yourself and request conditions verbally with ETAs |
| Assigned To | Ashley Merizio (`3dca68fc-ee7e-46cc-91a1-0c6176d4c32a`) |
| Due Date | Today (0 offset) |
| Priority | High |
| Completion Requirement | `log_call_borrower` |

### Automation 2: Order Title Work (Disclosure Signed)
| Field | Value |
|-------|-------|
| Trigger | When `disclosure_status` changes to `Signed` |
| Task Name | Order Title Work |
| Description | Disclosures have been signed. Please order title work. |
| Assigned To | Ashley Merizio (`3dca68fc-ee7e-46cc-91a1-0c6176d4c32a`) |
| Due Date | Today (0 offset) |
| Priority | High |
| Completion Requirement | Complex: `title_status = Ordered` AND `title_eta` populated |

### Automation 3: Order Condo Docs (Disclosure Signed + Condo Property)
| Field | Value |
|-------|-------|
| Trigger | When `disclosure_status` changes to `Signed` AND `property_type` contains `Condo` |
| Task Name | Order condo docs |
| Description | Disclosures have been signed. Please order condo documents. |
| Assigned To | Ashley Merizio (`3dca68fc-ee7e-46cc-91a1-0c6176d4c32a`) |
| Due Date | Today (0 offset) |
| Priority | High |
| Completion Requirement | Complex: `condo_status = Ordered` AND `condo_ordered_date` populated AND `condo_eta` populated |

---

## Part 3: Complex Completion Requirements

### Current State
The system supports simple requirements:
- `field_populated:field_name` - single field must have value
- `field_value:field=value1,value2` - single field must equal one of values

### Needed for New Tasks
- **Order Title Work**: `title_status = Ordered` AND `title_eta` is populated
- **Order Condo Docs**: `condo_status = Ordered` AND `condo_ordered_date` is populated AND `condo_eta` is populated

### Implementation

**A. Add new completion requirement types**
Add to TaskAutomationModal.tsx dropdown:
```typescript
<SelectItem value="compound:title_ordered">Require Title Ordered + ETA</SelectItem>
<SelectItem value="compound:condo_ordered">Require Condo Ordered + Order Date + ETA</SelectItem>
```

**B. Update taskCompletionValidation.ts**
Add compound requirement validation:

```typescript
// Compound: Title Ordered
if (requirementType === 'compound:title_ordered') {
  const { data: lead } = await supabase
    .from('leads')
    .select('title_status, title_eta')
    .eq('id', task.borrower_id)
    .single();

  const unmet = [];
  if (lead?.title_status !== 'Ordered') unmet.push('Title Status = Ordered');
  if (!lead?.title_eta) unmet.push('Title ETA');

  if (unmet.length > 0) {
    return {
      canComplete: false,
      message: `The following requirements must be met: ${unmet.join(', ')}`,
      missingRequirement: requirementType,
    };
  }
}

// Compound: Condo Ordered
if (requirementType === 'compound:condo_ordered') {
  const { data: lead } = await supabase
    .from('leads')
    .select('condo_status, condo_ordered_date, condo_eta')
    .eq('id', task.borrower_id)
    .single();

  const unmet = [];
  if (lead?.condo_status !== 'Ordered') unmet.push('Condo Status = Ordered');
  if (!lead?.condo_ordered_date) unmet.push('Condo Order Date');
  if (!lead?.condo_eta) unmet.push('Condo ETA');

  if (unmet.length > 0) {
    return {
      canComplete: false,
      message: `The following requirements must be met: ${unmet.join(', ')}`,
      missingRequirement: requirementType,
    };
  }
}
```

**C. Add auto-complete triggers for compound requirements**
Update `autoCompleteTasksAfterFieldUpdate` in database.ts to handle compound requirements:

```typescript
// Handle compound requirements
if (req === 'compound:title_ordered') {
  // Must check all conditions are met
  const { data: lead } = await supabase
    .from('leads')
    .select('title_status, title_eta')
    .eq('id', leadId)
    .single();
  return lead?.title_status === 'Ordered' && lead?.title_eta;
}

if (req === 'compound:condo_ordered') {
  const { data: lead } = await supabase
    .from('leads')
    .select('condo_status, condo_ordered_date, condo_eta')
    .eq('id', leadId)
    .single();
  return lead?.condo_status === 'Ordered' && lead?.condo_ordered_date && lead?.condo_eta;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/taskCompletionValidation.ts` | Add compound requirement validation, add auto-complete-only logic |
| `src/services/database.ts` | Update `autoCompleteTasksAfterFieldUpdate` for compound requirements |
| `src/components/modals/TaskCompletionRequirementModal.tsx` | Add UI for auto-complete-only and compound requirements |
| `src/components/admin/TaskAutomationModal.tsx` | Add new completion requirement options to dropdown |

## Database Changes

**Insert 3 new task automations:**

```sql
-- 1. Borrower intro call (AWC)
INSERT INTO task_automations (
  name, task_name, task_description, trigger_type, trigger_config, 
  assigned_to_user_id, task_priority, due_date_offset_days, 
  is_active, category, subcategory, completion_requirement_type
) VALUES (
  'Borrower intro call',
  'Borrower intro call',
  'Call the borrower to introduce yourself and request conditions verbally with ETAs',
  'status_changed',
  '{"field": "loan_status", "target_status": "AWC"}',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission',
  'log_call_borrower'
);

-- 2. Order Title Work (Disclosure Signed)
INSERT INTO task_automations (
  name, task_name, task_description, trigger_type, trigger_config,
  assigned_to_user_id, task_priority, due_date_offset_days,
  is_active, category, subcategory, completion_requirement_type
) VALUES (
  'Order Title Work',
  'Order Title Work',
  'Disclosures have been signed. Please order title work.',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Signed"}',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission',
  'compound:title_ordered'
);

-- 3. Order Condo Docs (Disclosure Signed + Condo)
INSERT INTO task_automations (
  name, task_name, task_description, trigger_type, trigger_config,
  assigned_to_user_id, task_priority, due_date_offset_days,
  is_active, category, subcategory, completion_requirement_type
) VALUES (
  'Order condo docs',
  'Order condo docs',
  'Disclosures have been signed. Please order condo documents.',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Signed", "condition_field": "property_type", "condition_value": "Condo"}',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission',
  'compound:condo_ordered'
);

-- 4. Update existing disclosure task to use auto-complete-only
UPDATE task_automations 
SET completion_requirement_type = 'auto_complete_only:disc_file'
WHERE id = 'b33fd14f-4e26-4572-9790-317e808bf201';
```

---

## Technical Details

### Auto-Complete Flow
1. User updates a field on lead (e.g., uploads `disc_file`, sets `title_status = Ordered`)
2. Frontend calls `databaseService.autoCompleteTasksAfterFieldUpdate()`
3. Function finds all open tasks for that lead with matching completion requirements
4. For compound requirements, it checks ALL conditions are met
5. If met, task is marked as Done and toast shows success

### Title Status Values
The `title_status` field uses options: `Requested`, `Received`, `On Hold`. We need to add `Ordered` as an option or use `Requested` as the equivalent. Based on the user's screenshots showing "Ordered" in the Third Party Items section, we should add `Ordered` to the status options.

### Condo Status Values
The `condo_status` field has options including `Ordered` which is correct.

---

## Testing After Implementation

1. **Disclosure Document Task**:
   - Change disclosure_status to "Sent" on a file
   - Verify "Upload disclosure document" task is created
   - Try to manually complete it → should see popup explaining it's auto-complete only
   - Upload a disclosure document under Disclosures tab
   - Verify task auto-completes with a toast notification

2. **Borrower Intro Call (AWC)**:
   - Change loan_status to "AWC"
   - Verify "Borrower intro call" task is created, assigned to Ashley
   - Try to complete → should require call log first

3. **Order Title Work**:
   - Change disclosure_status to "Signed"
   - Verify "Order Title Work" task is created
   - Try to complete → should show "Title Status = Ordered and Title ETA required"
   - Set title_status to Ordered and add title_eta
   - Task should either auto-complete or allow manual completion

4. **Order Condo Docs**:
   - On a Condo property, change disclosure_status to "Signed"
   - Verify "Order condo docs" task is created
   - Try to complete → should require all 3 condo fields
   - Fill in all 3 fields → task should complete
