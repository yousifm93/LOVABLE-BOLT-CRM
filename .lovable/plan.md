

# Plan: Task Defaults and Clarify Completion Requirements

## What You Already Have (Completion Requirements)

The quick task templates already include the "must log a call" functionality:

| Quick Task | Completion Requirement |
|------------|----------------------|
| Borrower Call | Must log a call with borrower |
| Buyer's Agent Call | Must log a call with buyer's agent |
| Listing Agent Call | Must log a call with listing agent |
| Lead Follow-up | Must log any activity (call/email/note) |

When you create these tasks and try to complete them, the system already checks if the required action was logged!

---

## Changes Needed

### 1. Change Default Assignee to Yousif Mohamed

**Current behavior:** Tasks default to current logged-in user or Herman
**New behavior:** Tasks default to Yousif Mohamed (`230ccf6d-48f5-4f3c-89fd-f2907ebdba1e`)

**Files to update:**
- `src/components/modals/CreateTaskModal.tsx` - Change `getDefaultAssigneeId()` to return Yousif's ID
- `src/components/modals/CreateNextTaskModal.tsx` - Change `DEFAULT_ASSIGNEE_ID` to Yousif's ID
- `src/services/database.ts` - Add defaults in `createTask()` function for any tasks created without assignee/due_date

### 2. Ensure Due Date Always Defaults to Today

**Already implemented** in the modal forms, but need to enforce at database service level as a fallback.

### 3. Rename "Contingencies" UI for Clarity

Rename the section from "Contingencies" to "Lead Requirements" to distinguish it from the completion requirements.

---

## Code Changes

### Change 1: CreateTaskModal.tsx - Update default assignee

```typescript
// Line 137: Change from current user to Yousif Mohamed
const getDefaultAssigneeId = () => "230ccf6d-48f5-4f3c-89fd-f2907ebdba1e"; // Yousif Mohamed
```

### Change 2: CreateNextTaskModal.tsx - Update default assignee

```typescript
// Line 21: Change constant
const DEFAULT_ASSIGNEE_ID = "230ccf6d-48f5-4f3c-89fd-f2907ebdba1e"; // Yousif Mohamed
```

### Change 3: database.ts - Enforce defaults in createTask

```typescript
async createTask(task: TaskInsert) {
  // Apply defaults for due_date and assignee_id if not provided
  const taskWithDefaults = {
    ...task,
    due_date: task.due_date || new Date().toISOString().split('T')[0],
    assignee_id: task.assignee_id || '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e', // Yousif Mohamed
  };
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskWithDefaults)
    // ... rest of function
}
```

### Change 4: Rename "Contingencies" to "Lead Requirements"

Update the UI label in both CreateTaskModal and CreateNextTaskModal to be clearer:

```typescript
// Change from:
<Label>Contingencies (Optional)</Label>
<p>Task cannot be completed until these conditions are met on the lead</p>

// Change to:
<Label>Lead Requirements (Optional)</Label>
<p>These lead conditions must be met before the task can be completed</p>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/modals/CreateTaskModal.tsx` | Change default assignee to Yousif, rename Contingencies to Lead Requirements |
| `src/components/modals/CreateNextTaskModal.tsx` | Change default assignee to Yousif, rename Contingencies to Lead Requirements |
| `src/services/database.ts` | Add fallback defaults in createTask() |

---

## Quick Reference: Existing Completion Requirements

These are the action-based requirements that already exist:

| Requirement Type | What It Checks |
|-----------------|----------------|
| `log_call_borrower` | Call logged in call_logs for borrower |
| `log_call_buyer_agent` | Call logged in agent_call_logs for buyer's agent |
| `log_call_listing_agent` | Call logged in agent_call_logs for listing agent |
| `log_any_activity` | Any call, email, or note logged for borrower |
| `field_populated:appraisal_file` | Appraisal file uploaded to lead |
| `field_value:loan_status=SUB` | Lead's loan_status equals SUB |

If you want to add more completion requirement types (like "must upload appraisal" as a selectable option in the UI), let me know and I can add that as well!

