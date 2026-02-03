

# Plan: Fix Search Navigation, Add Latest File Updates Section & Default Task Assignees

## Summary

This plan addresses four issues:
1. **Search navigation not opening specific records** - Clicking an agent/lender/contact in sidebar search navigates to the page but doesn't open the specific record's detail view
2. **Idle functionality error** - Need to investigate database error when trying to idle leads
3. **Add "Latest File Update" section** - Add this section between "Send Email Templates" and "Pipeline Review" in the Active stage drawer
4. **Task assignee defaulting** - Tasks with no assignee should show the user who has the most recent task for that lead

---

## Issue 1: Search Navigation Not Opening Records

### Problem
When clicking a search result for an agent, lender, or contact, the app navigates to the correct page (e.g., `/contacts/agents`) but doesn't automatically open that specific record's detail drawer.

### Root Cause
The `AgentList.tsx`, `ApprovedLenders.tsx`, and `BorrowerList.tsx` pages don't read URL query parameters (`openAgent`, `openLender`, `openContact`) to auto-open the corresponding record.

### Solution
Add `useSearchParams` hook and effect to each page to detect and handle these URL parameters:

| File | Changes |
|------|---------|
| `src/pages/contacts/AgentList.tsx` | Add `useSearchParams`, detect `openAgent` param, auto-open that agent's drawer |
| `src/pages/contacts/ApprovedLenders.tsx` | Add `useSearchParams`, detect `openLender` param, auto-open that lender's drawer |
| `src/pages/contacts/BorrowerList.tsx` | Add `useSearchParams`, detect `openContact` param, auto-open that contact's drawer |

**Pattern to follow** (from Leads.tsx and Active.tsx):
```typescript
import { useSearchParams } from "react-router-dom";

const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  const openAgentId = searchParams.get('openAgent');
  if (openAgentId && !isLoading) {
    const agent = agents.find(a => a.id === openAgentId);
    if (agent) {
      setSelectedAgent(agent);
      setShowAgentDrawer(true);
      // Clear param to prevent re-opening
      setSearchParams(prev => {
        prev.delete('openAgent');
        return prev;
      }, { replace: true });
    }
  }
}, [searchParams, agents, isLoading]);
```

---

## Issue 2: Idle Functionality Error

### Problem
User reports error when trying to move leads to Idle stage.

### Investigation Needed
Database logs show a duplicate key constraint error on `task_assignees`. This may be triggered by a database automation when the pipeline stage changes.

### Solution
Check and fix the trigger that runs on pipeline stage changes. The error suggests the trigger is trying to insert a duplicate task assignee record.

---

## Issue 3: Add "Latest File Update" Section to Active Stage Drawer

### Problem
The Active stage drawer needs a "Latest File Update" section between "Send Email Templates" and "Pipeline Review" sections.

### Location in Code
`src/components/ClientDetailDrawer.tsx`, around line 2744-2795

### Solution
Add a new "Latest File Update" section for Active stage leads:

```typescript
{/* Latest File Update - For Active stage ONLY, between Email Templates and Pipeline Review */}
{(() => {
  const opsStage = client.ops?.stage?.toLowerCase() || '';
  const isActive = opsStage === 'active';
  if (!isActive) return null;
  return (
    <Card>
      <CardHeader className="pb-3 bg-white">
        <CardTitle className="text-sm font-bold">Latest File Update</CardTitle>
      </CardHeader>
      <CardContent className="bg-gray-50">
        <MentionableInlineEditNotes
          value={(client as any).latest_file_updates || ''}
          onValueChange={(value) => handleLeadUpdate('latest_file_updates', value)}
          placeholder="Add status updates, notes, or important information..."
          minHeight={80}
        />
      </CardContent>
    </Card>
  );
})()}
```

---

## Issue 4: Default Task Assignee to Most Recent Task User

### Problem
Tasks with no assignee show "Assign to..." placeholder. User wants these to default to the user who has the most recent task for that lead (borrower_id).

### Solution
Modify the task display logic in `TasksModern.tsx` to compute a fallback assignee when `assignee_ids` is empty:

1. **Add a helper function** to find the most recent task's assignee for a given borrower_id
2. **Update the assignee cell renderer** to use this fallback

```typescript
// Helper to get fallback assignee from most recent task for this borrower
const getFallbackAssignee = (task: ModernTask, allTasks: ModernTask[]): string[] => {
  if (!task.borrower_id) return [];
  
  // Find all tasks for this borrower, sorted by updated_at descending
  const borrowerTasks = allTasks
    .filter(t => t.borrower_id === task.borrower_id && t.id !== task.id)
    .filter(t => (t.assignee_ids && t.assignee_ids.length > 0) || t.assignee_id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  
  if (borrowerTasks.length === 0) return [];
  
  const mostRecentTask = borrowerTasks[0];
  return mostRecentTask.assignee_ids || (mostRecentTask.assignee_id ? [mostRecentTask.assignee_id] : []);
};

// In the assignee cell:
const effectiveAssigneeIds = 
  (row.original.assignee_ids?.length > 0 || row.original.assignee_id)
    ? (row.original.assignee_ids || [row.original.assignee_id])
    : getFallbackAssignee(row.original, tasks);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/contacts/AgentList.tsx` | Add URL param handling for `openAgent` |
| `src/pages/contacts/ApprovedLenders.tsx` | Add URL param handling for `openLender` |
| `src/pages/contacts/BorrowerList.tsx` | Add URL param handling for `openContact` |
| `src/components/ClientDetailDrawer.tsx` | Add "Latest File Update" section for Active stage |
| `src/pages/TasksModern.tsx` | Add fallback assignee logic for empty assignees |
| Database trigger (if needed) | Fix duplicate key error on idle transition |

---

## Expected Results

1. **Search Navigation**: Clicking "David Freed" in sidebar search opens the agent drawer immediately
2. **Idle Error**: Fixed - leads can be moved to Idle without database errors
3. **Latest File Update**: New editable section appears between Email Templates and Pipeline Review for Active stage leads
4. **Task Assignees**: Tasks without assignees show the avatar of the user who has the most recent task for that borrower

---

## Testing Steps

1. Search for "David Freed" in sidebar search, click result, verify drawer opens directly
2. Open an Active lead, try to move to Idle, verify no error
3. Open an Active lead, verify "Latest File Update" section appears between Email Templates and Pipeline Review
4. View tasks list, find a task with "Assign to..." placeholder, verify it now shows the correct default user

