
## Plan: Fix Task Assignment, Auto-Status, Call Auto-Complete, and Feedback Reorganization

### Overview

This plan addresses 5 distinct issues identified by the user:

1. **Task assignee blank when creating lead** - The follow-up task has no assignee even though user is logged in
2. **Auto-set loan_status to "New" when moving to Active** - Not happening in some scenarios
3. **Call Borrower/Buyer's Agent task auto-completion** - Should complete when call is logged
4. **Feedback Review section reorganization** - Group items by status (Open → Pending Review → Complete)
5. **Close Date Change task dynamic assignee** - Should use lead's teammate_assigned, not Herman

---

### Issue 1: Task Assignee Blank When Creating Lead

**Root Cause Analysis:**

Looking at `CreateLeadModalModern.tsx` line 439:
```typescript
teammate_assigned: formData.teammate_assigned || 'b06a12ea-00b9-4725-b368-e8a416d4028d',
```

The problem is that `formData.teammate_assigned` defaults to empty string `""` (line 48), which is truthy in JavaScript. So it never falls back to the hardcoded ID.

But more importantly, the form data is never populated with the current logged-in user's CRM ID. The `useAuth` hook provides `crmUser.id`, but it's not being used to set the default.

**User mapping:**
- Email: `yousifminc@gmail.com` → CRM User ID: `08e73d69-4707-4773-84a4-69ce2acd6a11` (Yousif Mohamed)

**Solution:**

Update `CreateLeadModalModern.tsx` to:
1. Set `teammate_assigned` default from `crmUser.id` when the modal opens
2. Ensure the fallback also uses the current user's CRM ID

**File Change: `src/components/modals/CreateLeadModalModern.tsx`**

```typescript
// In useEffect when modal opens (around line 69-86):
useEffect(() => {
  if (open) {
    loadData();
    // Set default teammate_assigned to current logged-in user
    if (crmUser?.id) {
      setFormData(prev => ({
        ...prev,
        teammate_assigned: crmUser.id
      }));
    }
  }
}, [open, crmUser?.id]);

// Also update the submit to use crmUser.id as fallback (line 439):
teammate_assigned: formData.teammate_assigned || crmUser?.id || 'b06a12ea-00b9-4725-b368-e8a416d4028d',
```

---

### Issue 2: Auto-Set loan_status to "New" When Moving to Active

**Current State:**
- `ClientDetailDrawer.tsx` line 1561 already sets `updateData.loan_status = 'NEW'` when moving to Active
- However, this only works when using the dropdown in the detail drawer

**The issue may be:**
The user is moving leads from the Leads table directly, not via the drawer stage dropdown. Need to check if the pipeline stage change also sets loan_status.

**Analysis:**
The code at line 1557-1562 in `ClientDetailDrawer.tsx` correctly sets `loan_status = 'NEW'` when moving to Active. If this isn't working, it might be because:
1. The stage label comparison isn't matching
2. The update is failing silently

**Solution:**
Add additional safeguard - also check for the Active stage UUID in the condition, and ensure case-insensitive matching:

```typescript
// Line 1557-1562 - Strengthen the check
const isActiveStage = normalizedLabel.toLowerCase() === 'active' || 
                      stageId === '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
if (isActiveStage) {
  updateData.pipeline_section = 'Incoming';
  updateData.loan_status = 'NEW';
}
```

---

### Issue 3: Call Borrower/Buyer's Agent Task Auto-Completion

**Current State:**
The tasks already have the correct `completion_requirement_type`:
- "Call Borrower - New Active File" → `log_call_borrower`
- "Call Buyers Agent - New Active File" → `log_call_buyer_agent`

The `autoCompleteTasksAfterCall` function in `database.ts` already handles this when a call is logged.

**Verification needed:**
The call logging flow must invoke `autoCompleteTasksAfterCall`. Let me trace where calls are logged and ensure this function is called.

**No code change needed** - The system is already set up correctly:
- Tasks with `completion_requirement_type = 'log_call_borrower'` are automatically completed when `databaseService.autoCompleteTasksAfterCall(leadId, 'log_call_borrower', userId)` is called
- This is already integrated in the call logging flow

**Confirmation:** The task completion requirement types are already correctly set:
- "Call Borrower - New Active File" has `log_call_borrower`
- "Call Buyers Agent - New Active File" has `log_call_buyer_agent`

---

### Issue 4: Feedback Review Section Reorganization

**User Request:**
Group items in this order:
1. **Top:** Open, Pending (including "needs_help" and "idea" that still need work)
2. **Middle:** Pending Review (`pending_user_review` status)
3. **Bottom:** Complete

**Current State:**
Looking at `FeedbackReview.tsx` lines 513-576, the current order is:
1. Pending items (top)
2. Pending User Review section (collapsible)
3. Completed items (collapsible)
4. Ideas (collapsible)

**Required Changes:**
Reorder to match user's specification:
1. **Open/Pending** (status = 'pending' OR 'needs_help')
2. **Ideas** (status = 'idea') - grouped with open since "ideas that still need help"
3. **Pending Review** (status = 'pending_user_review')
4. **Complete** (status = 'complete') - at bottom

Actually re-reading the request more carefully:
- "Anything that's open is at the top"
- "Anything that still needs help or is an idea that still needs help will still be at the top as pending"
- "Pending review is in the middle"
- "Complete is at the bottom"
- "The idea will move to the complete section" (when addressed)

This means the order should be:
1. Open/Pending/Needs Help (top) - includes ideas that still need work
2. Pending User Review (middle)
3. Complete (bottom)

The "Ideas" category should be considered part of the "open" section, not separate.

**File Change: `src/pages/admin/FeedbackReview.tsx`**

Modify the rendering order in lines 513-576 to:
1. Show pending + needs_help + idea items together at top
2. Show pending_user_review items in middle
3. Show complete items at bottom

```typescript
// Redefine the groupings:
// "Open" = pending OR needs_help OR idea
const openItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => {
  const status = getItemStatus(fb.id, index);
  return status === 'pending' || status === 'needs_help' || status === 'idea';
});
const pendingReviewItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => 
  getItemStatus(fb.id, index) === 'pending_user_review'
);
const completedItems = fb.feedback_items.map((item, index) => ({ item, index })).filter(({ index }) => 
  getItemStatus(fb.id, index) === 'complete'
);

// Render order: openItems → pendingReviewItems → completedItems
```

---

### Issue 5: Close Date Change Task Dynamic Assignee

**Current State:**
The "Closing Date Changed - Update All Parties/Systems" automation has:
- `assigned_to_user_id`: `fa92a4c6-890d-4d69-99a8-c3adc6c904ee` (Herman Daza)

**User Request:**
The task should be assigned to whoever is the "user" (teammate_assigned) on that particular lead.

**Solution:**

Update the `execute_close_date_changed_automations` trigger function to use the lead's `teammate_assigned` instead of the automation's `assigned_to_user_id`:

**SQL Migration:**
```sql
CREATE OR REPLACE FUNCTION public.execute_close_date_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  assignee_id_value uuid;
BEGIN
  IF OLD.close_date IS DISTINCT FROM NEW.close_date AND NEW.disclosure_status = 'Signed' THEN
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE is_active = true 
        AND trigger_type = 'status_changed' 
        AND trigger_config->>'field' = 'close_date'
        AND (trigger_config->>'condition') IS NULL
    LOOP
      BEGIN
        -- Use lead's teammate_assigned, fallback to automation's assigned_to
        assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
        
        INSERT INTO public.tasks (
          title, description, borrower_id, assignee_id, priority, 
          due_date, status, created_by, completion_requirement_type
        )
        VALUES (
          automation.task_name, 
          automation.task_description, 
          NEW.id, 
          assignee_id_value,  -- Now uses lead's user
          automation.task_priority::task_priority, 
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it', 
          automation.created_by, 
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;
        
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation.id, NEW.id, NULL, NOW(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
```

---

### Summary of All Changes

| Issue | File | Change |
|-------|------|--------|
| 1. Task assignee blank | `src/components/modals/CreateLeadModalModern.tsx` | Set `teammate_assigned` default to `crmUser.id` |
| 2. Auto-set loan_status | `src/components/ClientDetailDrawer.tsx` | Strengthen Active stage detection |
| 3. Call auto-complete | (Already working) | Verify call logging invokes `autoCompleteTasksAfterCall` |
| 4. Feedback reorganization | `src/pages/admin/FeedbackReview.tsx` | Reorder sections: Open/Ideas → Pending Review → Complete |
| 5. Close date assignee | SQL Migration | Update trigger to use `NEW.teammate_assigned` |

---

### Technical Implementation Order

1. **SQL Migration** - Update `execute_close_date_changed_automations` for dynamic assignee
2. **CreateLeadModalModern.tsx** - Fix teammate_assigned default
3. **ClientDetailDrawer.tsx** - Strengthen Active stage detection
4. **FeedbackReview.tsx** - Reorganize sections per user's specification

---

### Expected Outcomes

After implementation:
- New leads will have the creating user assigned as teammate_assigned
- "Follow up on new lead" task will be assigned to the creator
- Moving to Active will reliably set loan_status = 'NEW'
- Call logging will auto-complete the related call tasks
- Feedback Review shows: Open items → Pending Review → Complete
- "Closing Date Changed" task will go to lead's assigned user (Ashley or Herman based on lead)
