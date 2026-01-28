

# Plan: Feedback Badge Fix, Quick Tasks, and Task Contingencies

## Overview
This plan addresses three feature requests:
1. Fix Team Feedback Review badges to only show "Open Items" count
2. Add "Disclose" quick task template (HSCI already exists)
3. Add task contingencies/dependencies selection when creating tasks

---

## Summary of Changes

| Feature | Description |
|---------|-------------|
| Feedback Badge Fix | Change count from "unread feedback" to "Open Items" (pending + needs_help status) |
| Quick Task: Disclose | Add "Disclose" template assigned to Herman with due date today |
| Task Contingencies | Add dropdown to select contingencies that must be met before task completion |

---

## Part 1: Fix Feedback Badge Count

**Problem:** The red badges currently show "unread feedback" count, but should show "Open Items" count (only items with pending or needs_help status).

**File:** `src/pages/admin/FeedbackReview.tsx`

**Current code (line 276-278):**
```typescript
const getUnreadCount = (userId: string) => {
  const userFeedback = getUserFeedback(userId);
  return userFeedback.filter(f => !f.is_read_by_admin).length;
};
```

**Fix:** Change to count Open Items instead:
```typescript
const getOpenItemsCount = (userId: string) => {
  const userFeedback = getUserFeedback(userId);
  let count = 0;
  userFeedback.forEach(fb => {
    fb.feedback_items.forEach((item, index) => {
      const status = getItemStatus(fb.id, index);
      // Only count pending and needs_help as "open"
      if (status === 'pending' || status === 'needs_help') {
        count++;
      }
    });
  });
  return count;
};
```

Update usage (line 490):
```typescript
const openCount = getOpenItemsCount(member.id);
```

And render badge only when `openCount > 0`.

---

## Part 2: Add "Disclose" Quick Task Template

**Files to modify:**
- `src/components/modals/CreateTaskModal.tsx`
- `src/components/modals/CreateNextTaskModal.tsx`

**Add template to QUICK_TASK_TEMPLATES array:**
```typescript
{
  id: 'disclose',
  label: 'Disclose',
  title: 'Disclose',
  description: 'Send out initial disclosures to the borrower',
  default_assignee_id: 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee', // Herman
  priority: 'High',
  completion_requirement_type: 'none',
},
```

Note: HSCI template already exists with Herman as assignee.

---

## Part 3: Add Task Contingencies Selection

**Concept:** When creating a task, the user can select one or more contingencies that must be met on the lead before the task can be completed.

### Database Change
Add a new column to the `tasks` table:
```sql
ALTER TABLE tasks ADD COLUMN contingency_requirements jsonb DEFAULT NULL;
-- Example value: ["finance_contingency", "appraisal_status_received"]
```

### Available Contingencies
Based on lead fields, offer these options:
| Contingency | Lead Field | Condition |
|-------------|------------|-----------|
| Finance Contingency Met | `fin_cont` | Date has passed |
| Appraisal Received | `appraisal_status` | = 'Received' |
| Title Clear | `title_status` | = 'Clear' |
| Insurance Received | `hoi_status` | = 'Received' |
| CTC Status | `cd_status` | = 'CTC' |
| Contract Uploaded | `contract_file` | Not null |
| Initial Approval Received | `initial_approval_file` | Not null |

### UI Changes

**Files to modify:**
- `src/components/modals/CreateTaskModal.tsx`
- `src/components/modals/CreateNextTaskModal.tsx`

**Add new section in task creation form:**
```typescript
// Add after Due Date/Priority fields

<div className="space-y-2">
  <Label>Contingencies (Optional)</Label>
  <p className="text-xs text-muted-foreground mb-2">
    Task cannot be completed until these conditions are met on the lead
  </p>
  <div className="flex flex-wrap gap-2">
    {CONTINGENCY_OPTIONS.map((option) => (
      <Button
        key={option.id}
        type="button"
        variant={selectedContingencies.includes(option.id) ? "default" : "outline"}
        size="sm"
        onClick={() => toggleContingency(option.id)}
        className="text-xs"
      >
        {option.label}
      </Button>
    ))}
  </div>
</div>
```

**Contingency options array:**
```typescript
const CONTINGENCY_OPTIONS = [
  { id: 'finance_contingency', label: 'Finance Contingency', field: 'fin_cont', type: 'date_passed' },
  { id: 'appraisal_received', label: 'Appraisal Received', field: 'appraisal_status', value: 'Received' },
  { id: 'title_clear', label: 'Title Clear', field: 'title_status', value: 'Clear' },
  { id: 'insurance_received', label: 'Insurance Received', field: 'hoi_status', value: 'Received' },
  { id: 'contract_uploaded', label: 'Contract Uploaded', field: 'contract_file', type: 'not_null' },
  { id: 'initial_approval', label: 'Initial Approval', field: 'initial_approval_file', type: 'not_null' },
];
```

### Task Completion Logic

**File:** `src/services/taskCompletionValidation.ts` (or create new)

When marking a task as complete, check if contingencies are met:
```typescript
async function validateTaskContingencies(task: Task, lead: Lead): Promise<{ valid: boolean; unmet: string[] }> {
  const unmet: string[] = [];
  
  if (!task.contingency_requirements?.length) {
    return { valid: true, unmet: [] };
  }
  
  for (const contingencyId of task.contingency_requirements) {
    const option = CONTINGENCY_OPTIONS.find(c => c.id === contingencyId);
    if (!option) continue;
    
    if (option.type === 'date_passed') {
      const dateValue = lead[option.field];
      if (!dateValue || new Date(dateValue) > new Date()) {
        unmet.push(option.label);
      }
    } else if (option.type === 'not_null') {
      if (!lead[option.field]) {
        unmet.push(option.label);
      }
    } else if (option.value) {
      if (lead[option.field] !== option.value) {
        unmet.push(option.label);
      }
    }
  }
  
  return { valid: unmet.length === 0, unmet };
}
```

### Visual Indicator on Tasks

Show a lock icon or badge on tasks that have unmet contingencies:
```typescript
{task.contingency_requirements?.length > 0 && (
  <Badge variant="outline" className="text-xs bg-amber-50">
    <Lock className="h-3 w-3 mr-1" />
    {task.contingency_requirements.length} contingencies
  </Badge>
)}
```

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `src/pages/admin/FeedbackReview.tsx` | Change badge count logic from unread to open items |
| `src/components/modals/CreateTaskModal.tsx` | Add Disclose template + contingencies UI |
| `src/components/modals/CreateNextTaskModal.tsx` | Add Disclose template + contingencies UI |
| `src/services/taskCompletionValidation.ts` | Add contingency validation logic |
| New migration | Add `contingency_requirements` column to tasks table |

---

## Implementation Order

1. **Quick Win:** Add "Disclose" template to both modals
2. **Badge Fix:** Update FeedbackReview.tsx count logic
3. **Database:** Create migration for contingency_requirements column
4. **UI:** Add contingencies selection to task creation forms
5. **Logic:** Implement contingency validation on task completion

---

## Visual Preview

```text
Create Task Modal (Updated)
+--------------------------------------------------+
| Task Title *        [Disclose                  ] |
+--------------------------------------------------+
| Description         [Send out initial discl... ] |
+--------------------------------------------------+
| Quick Tasks                                      |
| [Lead Follow-up] [Pending App] [Screen]         |
| [Conditions] [Pre-Qualify] [Pre-Approve]        |
| [Borrower Call] [Buyer's Agent] [Listing Agent] |
| [HSCI] [Disclose] [On-board]                    |
+--------------------------------------------------+
| Due Date      | Priority      | Assignee        |
| [Today      ] | [High      ▾] | [Herman Daza ▾] |
+--------------------------------------------------+
| Contingencies (Optional)                         |
| Task cannot be completed until these are met     |
| [Finance ✓] [Appraisal] [Title] [Contract ✓]   |
+--------------------------------------------------+
|                              [Cancel] [Create]  |
+--------------------------------------------------+
```

