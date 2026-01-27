
## Plan: Fix Task Automation Triggers, Quick Tasks UI, and Meeting Date Bug

### Issues Summary

This plan addresses 5 distinct issues:
1. **Active stage tasks not being created** - Automations for `loan_status = 'New'` don't fire because of case sensitivity mismatch
2. **Task assignee corrections** - Call tasks should be assigned to Yousif, not Herman
3. **Quick task templates in "No Active Tasks" popup** - Add the quick task buttons to the CreateNextTaskModal
4. **Face-to-face meeting dates off by one day** - Bug in date conversion causes meetings to appear one day earlier
5. **Lead details page delay** - Investigate and improve loading experience

---

### Issue 1: Task Automations Not Firing (Case Sensitivity)

**Root Cause**: The trigger function compares `loan_status::text = 'New'` (mixed case), but some leads have `loan_status = 'NEW'` (uppercase). This is a case-sensitive comparison failure.

**Evidence**:
```
-- Automations target 'New' (mixed case)
SELECT trigger_config->>'target_status' FROM task_automations WHERE name = 'Disclose New Client';
-- Returns: 'New'

-- Oscar's lead has 'NEW' (uppercase)
SELECT loan_status FROM leads WHERE first_name = 'Oscar';
-- Returns: 'NEW'
```

**Solution**: Update the trigger function to use case-insensitive comparison.

**SQL Change**:
```sql
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
...
  -- Change this line:
  AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  -- To:
  AND LOWER(ta.trigger_config->>'target_status') = LOWER(NEW.loan_status::text)
```

---

### Issue 2: Correct Task Assignees

**Current State**:
- "Call Borrower - New Active File" → Herman Daza (`fa92a4c6-...`)
- "Call Buyers Agent - New Active File" → Herman Daza (`fa92a4c6-...`)

**Required State** (per user):
- "Disclose" and "On-Board" → Herman Daza ✅ (already correct)
- "Call Borrower" and "Call Buyers Agent" → **Yousif Mohamed** (`230ccf6d-48f5-4f3c-89fd-f2907ebdba1e`)

**SQL Change**:
```sql
-- Update Call Borrower task to Yousif
UPDATE task_automations 
SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE task_name = 'Call Borrower - New Active File';

-- Update Call Buyers Agent task to Yousif
UPDATE task_automations 
SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE task_name = 'Call Buyers Agent - New Active File';
```

---

### Issue 3: Quick Task Templates in "No Active Tasks" Popup

**Current State**: The "No Active Tasks" popup (`CreateNextTaskModal.tsx`) has a manual form with title, description, due date, priority, and assignee fields, but no quick task buttons.

**Required State**: Add the same quick task buttons from `CreateTaskModal.tsx`:
- Lead Follow-up
- Pending App Follow-up
- Screen
- Conditions
- Pre-Qualify
- Pre-Approve
- Borrower Call
- Buyer's Agent Call
- Listing Agent Call
- HSCI

**Code Change** in `src/components/modals/CreateNextTaskModal.tsx`:

1. Import the `QUICK_TASK_TEMPLATES` array or define a subset
2. Add a "Quick Tasks" section with toggle buttons
3. When a quick task is selected, auto-fill the form fields

```typescript
// Add Quick Tasks section before the form
<div className="space-y-2 mb-4">
  <Label className="text-sm font-medium">Quick Tasks</Label>
  <div className="flex flex-wrap gap-2">
    {QUICK_TASK_TEMPLATES.map((template) => (
      <Button
        key={template.id}
        type="button"
        variant={selectedTemplate === template.id ? "default" : "outline"}
        size="sm"
        onClick={() => applyTemplate(template.id)}
        className="text-xs"
      >
        {template.label}
      </Button>
    ))}
  </div>
</div>
```

---

### Issue 4: Face-to-Face Meeting Dates Off by One Day

**Root Cause**: In `AgentMeetingLogModal.tsx` (line 74):

```typescript
face_to_face_meeting: new Date(meetingDate).toISOString(),
```

When `meetingDate = "2026-01-26"` (date-only string), JavaScript's `new Date("2026-01-26")` interprets it as **midnight UTC** (`2026-01-26T00:00:00Z`).

When displayed in Eastern Time (UTC-5), this becomes `2026-01-25T19:00:00` - **one day earlier**.

**Evidence** from database:
```
face_to_face_meeting: 2026-01-26 00:00:00+00  ← UTC midnight
meeting_date_et: 2026-01-25                    ← Displayed as Jan 25 in ET!
```

**Solution**: Convert to noon local time to prevent day-shift issues:

```typescript
// Before (line 74):
face_to_face_meeting: new Date(meetingDate).toISOString(),

// After:
face_to_face_meeting: new Date(meetingDate + 'T12:00:00').toISOString(),
```

This matches the approach already used for the log entry (line 64).

**Files to Modify**:
- `src/components/modals/AgentMeetingLogModal.tsx` (line 74)
- `src/components/modals/QuickAddActivityModal.tsx` (line 224) - Same issue exists here

---

### Issue 5: Lead Details Page Delay

**Current Behavior**: After creating a lead, there's a delay before the details drawer can be opened, requiring a page refresh.

**Root Cause**: After `onLeadCreated()` is called, the parent component refetches all leads. The new lead may not be immediately available in the list for selection.

**Solution Options**:

**Option A - Return lead ID and open immediately**:
1. Modify `CreateLeadModalModern` to return the new lead's ID
2. Parent component can immediately open the drawer with the new lead ID
3. Drawer fetches lead data independently if not in list yet

**Option B - Optimistic UI update**:
1. Add the new lead to the local state immediately after creation
2. Background refetch updates with server data

**Recommended Implementation (Option A)**:
```typescript
// In CreateLeadModalModern:
const handleSubmit = async () => {
  // ... create lead ...
  const newLead = await databaseService.createLead({...});
  onLeadCreated(newLead.id); // Pass the ID back
};

// In parent (LeadsModern):
const handleLeadCreated = (newLeadId: string) => {
  // Immediately open drawer with new lead ID
  setSelectedLeadId(newLeadId);
  setIsDrawerOpen(true);
  // Also refetch list in background
  refetchLeads();
};
```

---

### Technical Summary

| File | Changes |
|------|---------|
| SQL Migration | Fix case-insensitive comparison in trigger; Update assignees for call tasks |
| `src/components/modals/CreateNextTaskModal.tsx` | Add Quick Tasks section with templates |
| `src/components/modals/AgentMeetingLogModal.tsx` | Fix date conversion on line 74 |
| `src/components/modals/QuickAddActivityModal.tsx` | Fix date conversion on line 224 |
| `src/components/modals/CreateLeadModalModern.tsx` | Return lead ID on creation |
| `src/pages/LeadsModern.tsx` | Accept lead ID and open drawer immediately |

---

### Order of Implementation

1. **SQL Migration** - Fix trigger function case sensitivity + update task assignees
2. **Date Bug Fix** - AgentMeetingLogModal.tsx and QuickAddActivityModal.tsx
3. **Quick Tasks UI** - CreateNextTaskModal.tsx
4. **Lead Details Delay** - CreateLeadModalModern.tsx and LeadsModern.tsx

---

### Expected Outcomes

After implementation:
- ✅ All 4 tasks (Disclose, On-board, Call Borrower, Call Buyer's Agent) will be created when moving to Active/New status
- ✅ Disclose and On-board assigned to Herman; Call tasks assigned to Yousif
- ✅ "No Active Tasks" popup will have quick task buttons
- ✅ Face-to-face meetings will display correct dates
- ✅ New leads can be opened immediately after creation
