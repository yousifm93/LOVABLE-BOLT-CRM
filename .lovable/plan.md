
# Plan: Fix Multiple Issues in Mortgage CRM

## Summary

This plan addresses 8 issues:
1. **Task creation automation not working for all users** - Fix trigger to work for all accounts
2. **Add "User" filter to Leads page** - Add teammate_assigned filter option
3. **Add "Live Deal" section with Finance Contingency** - Reorganize DetailsTab
4. **Tasks box height restriction** - Add fixed height with scroll
5. **Duplicate task activity log entries** - Remove redundant note creation
6. **Agent search not working in sidebar** - Fix search to include agents
7. **Disclose task validation not working** - Fix validation logic
8. **Search dropdown width issue** - Already fixed in previous update, will verify

---

## Issue 1: Task Creation Automation Not Working For All Users

### Root Cause
The task automation trigger `execute_lead_created_automations` uses `NEW.teammate_assigned` to assign the follow-up task. However, in the `CreateLeadModalModern` and `databaseService.createLead()`, when other users create leads, the `teammate_assigned` value may not be properly set to their user ID.

### Technical Analysis
Looking at `databaseService.createLead()` (lines 808-815):
- It uses `userId` from `supabase.auth.getSession()` (which is the auth.users UUID)
- Then queries `users` table with `.eq('id', userId)` - but `userId` is an auth UUID, not a users table UUID

### Solution
**File: `src/services/database.ts`** (around lines 808-815)

Fix the teammate assignment logic to properly map auth user ID to CRM user ID:

```typescript
// Current (broken):
const { data: teammateUser } = await supabase
  .from('users')
  .select('id')
  .eq('id', userId)  // Wrong! userId is auth user ID
  .maybeSingle();

// Fixed:
const { data: teammateUser } = await supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', userId)  // Correct! Match on auth_user_id
  .maybeSingle();
```

This ensures that whoever creates the lead gets their proper CRM user ID assigned to `teammate_assigned`, which the database trigger then uses for the "Follow up on new lead" task.

---

## Issue 2: Add "User" Filter to Leads Page

### Solution
**File: `src/pages/Leads.tsx`** (around line 409-424)

Add a new filter column for `teammate_assigned`:

```typescript
const filterColumns = [
  { value: 'first_name', label: 'First Name', type: 'text' as const },
  { value: 'last_name', label: 'Last Name', type: 'text' as const },
  // ... existing filters ...
  { value: 'teammate_assigned', label: 'User', type: 'select' as const, options: [] }, // Add this
  { value: 'created_at', label: 'Created Date', type: 'date' as const },
];
```

Since this is a user ID field, we need to load user options dynamically. Modify to use a special user filter:

```typescript
// Add user options from already-loaded users array
{ 
  value: 'teammate_assigned', 
  label: 'User', 
  type: 'select' as const, 
  options: users.map(u => u.id)  // Will need custom rendering
},
```

Better approach: Add user name mapping to the filter system. This requires modifying the filter to show user names but filter by ID.

---

## Issue 3: Add "Live Deal" Section with Finance Contingency

### Solution
**File: `src/components/lead-details/DetailsTab.tsx`**

Add a new "Live Deal" section after "Subject Property Address" containing:
- Finance Contingency (fin_cont)
- Subject Property Rental Income
- Closing Date
- Lender Pre-Payment Penalty
- Credits
- Lock Expiration

### Implementation
After the "Subject Property Address" section (around line 1350), add:

```typescript
{/* LIVE DEAL SECTION */}
<div className="space-y-4 pt-4">
  <h3 className="text-lg font-semibold flex items-center gap-2">
    <Target className="h-5 w-5 text-primary" />
    Live Deal
  </h3>
  <div className="p-4 bg-muted/30 rounded-lg">
    <FourColumnDetailLayout items={[
      {
        icon: Calendar,
        label: "Finance Contingency",
        value: formatDate((client as any).fin_cont),
        editComponent: isEditing ? (
          <InlineEditDate
            value={editData.fin_cont}
            onValueChange={(value) => setEditData(prev => ({ ...prev, fin_cont: value }))}
          />
        ) : undefined
      },
      {
        icon: DollarSign,
        label: "Subject Property Rental Income",
        value: formatCurrency((client as any).subject_property_rental_income),
        editComponent: isEditing ? (
          <InlineEditCurrency
            value={editData.subject_property_rental_income}
            onValueChange={(value) => setEditData(prev => ({ ...prev, subject_property_rental_income: value }))}
          />
        ) : undefined
      },
      {
        icon: Calendar,
        label: "Closing Date",
        value: formatDate((client as any).close_date),
        editComponent: isEditing ? (
          <InlineEditDate
            value={editData.close_date}
            onValueChange={(value) => setEditData(prev => ({ ...prev, close_date: value }))}
          />
        ) : undefined
      },
      {
        icon: DollarSign,
        label: "Prepayment Penalty",
        value: formatCurrency((client as any).prepayment_penalty),
        editComponent: // existing editor
      },
      {
        icon: DollarSign,
        label: "Credits",
        value: formatCurrency((client as any).adjustments_credits),
        editComponent: // existing editor
      },
      {
        icon: Calendar,
        label: "Lock Expiration",
        value: formatDate((client as any).lock_expiration_date),
        editComponent: // existing editor
      },
    ]} />
  </div>
</div>
```

Move the relevant fields from "Rate Lock Information" section to this new section.

---

## Issue 4: Tasks Box Height Restriction

### Solution
**File: `src/components/ClientDetailDrawer.tsx`** (around line 2831-2871)

Add a max-height and scroll to the Tasks card:

```typescript
{/* Tasks */}
<Card>
  <CardHeader className="pb-3 bg-white">
    <CardTitle className="text-sm font-bold flex items-center justify-between">
      Tasks
      <Button size="sm" variant="outline" onClick={() => setShowCreateTaskModal(true)} className="h-6 px-2 text-xs">
        <Plus className="h-3 w-3 mr-1" />
        Add Task
      </Button>
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-2 bg-gray-50 max-h-[280px] overflow-y-auto">
    {/* existing task list rendering */}
  </CardContent>
</Card>
```

The `max-h-[280px]` roughly matches the height of the Borrower Info card. Adding `overflow-y-auto` enables scrolling when tasks exceed this height.

---

## Issue 5: Duplicate Task Activity Log Entries

### Root Cause
When a task is created:
1. The task is inserted into the `tasks` table
2. `createTaskActivityLog()` is called, which inserts a note into `notes` table
3. `loadActivities()` fetches both tasks AND notes
4. Result: The same task appears twice - once from tasks table, once from notes table

### Solution
**File: `src/components/modals/CreateTaskModal.tsx`** (around lines 426-442)

Remove the call to `createTaskActivityLog()`:

```typescript
// Before:
if (formData.borrower_id && createdTask) {
  const assignedUser = users.find(u => u.id === formData.assignee_id);
  const assigneeName = assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}`.trim() : undefined;
  
  try {
    await databaseService.createTaskActivityLog({
      lead_id: formData.borrower_id,
      task_id: createdTask.id,
      task_title: formData.title,
      assignee_name: assigneeName,
      due_date: formData.due_date,
      author_id: crmUser.id,
    });
  } catch (logError) {
    console.error('Failed to create task activity log:', logError);
  }
}

// After: Remove the entire block above - tasks are already shown in activity feed directly from tasks table
```

The activity tab already loads tasks directly from the database via `databaseService.getLeadActivities()`, so the redundant note-based log is not needed.

---

## Issue 6: Agent Search Not Working in Sidebar

### Root Cause
Looking at `AppSidebar.tsx` lines 200-215, the agent search correctly queries `buyer_agents` table. However, the search results might not be rendering agents due to missing icon handling.

### Analysis
In lines 474-477:
```typescript
{result.type === 'lead' && <User className="h-4 w-4 text-blue-500" />}
{result.type === 'agent' && <Phone className="h-4 w-4 text-green-500" />}
{result.type === 'lender' && <Building className="h-4 w-4 text-purple-500" />}
```

But `result.type === 'contact'` is not handled with an icon. More importantly, if the agent data isn't being returned, we need to check the query.

### Solution
**File: `src/components/AppSidebar.tsx`** (around line 200-215)

The issue is that the search might be filtering out agents due to `deleted_at` filter. Let me verify and fix:

```typescript
// Ensure agents query works correctly
const { data: agents } = await supabase
  .from('buyer_agents')
  .select('id, first_name, last_name, brokerage')
  .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,brokerage.ilike.%${term}%`)
  .is('deleted_at', null)
  .limit(5);

// Debug: Add console.log to verify agents are being found
console.log('Agent search results:', agents);
```

Also add icon for 'contact' type in line 478:
```typescript
{result.type === 'contact' && <User className="h-4 w-4 text-orange-500" />}
```

---

## Issue 7: Disclose Task Validation Not Working

### Root Cause
Looking at `taskCompletionValidation.ts` lines 329-359, the validation checks for "Disclose" in the task title. However, this validation only runs when `validateTaskCompletion()` is called, which happens in `handleTaskToggle()`.

The issue is that the user is changing the `disclosure_status` to "Sent" directly in the UI without the task validation blocking them. The Disclose task validation was meant to block the TASK completion, not the status field change.

### Solution
Two-part fix:

**Part A: Block disclosure_status change if no file uploaded**

**File: `src/services/statusChangeValidation.ts`**

Add a rule for disclosure_status field:
```typescript
// Add rule to block disclosure_status = 'Sent' unless disc_file is populated
{
  fieldName: 'disclosure_status',
  targetValue: 'Sent',
  requiredFields: [
    { field: 'disc_file', message: 'You must upload a Disclosure document before setting status to Sent' }
  ],
  message: 'Disclosure document required before marking as Sent'
}
```

**Part B: Ensure "Disclose" task validation works**

The current validation in `taskCompletionValidation.ts` (lines 329-359) looks correct but might have an issue with the borrower_id not being populated on the task.

Debug by checking if `task.borrower_id` is set when the task is created via automation.

---

## Issue 8: Search Dropdown Width (Already Fixed)

The search dropdown width was fixed in a previous update by adding `min-w-[280px] w-max`. Will verify this is working.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/database.ts` | Fix auth_user_id mapping in createLead |
| `src/pages/Leads.tsx` | Add "User" filter column |
| `src/components/lead-details/DetailsTab.tsx` | Add "Live Deal" section |
| `src/components/ClientDetailDrawer.tsx` | Add max-height to Tasks card |
| `src/components/modals/CreateTaskModal.tsx` | Remove duplicate activity log creation |
| `src/components/AppSidebar.tsx` | Debug/fix agent search, add contact icon |
| `src/services/statusChangeValidation.ts` | Add disclosure_status validation rule |

---

## Visual Summary

### Leads Filter (After)
```
Filters
├── First Name
├── Last Name
├── Email
├── ...
├── User ✨ NEW
├── Due Date
└── Created Date
```

### DetailsTab - Live Deal Section (After)
```
Subject Property Address
├── Address 1/2, City, State, Zip

Live Deal ✨ NEW
├── Finance Contingency
├── Subject Property Rental Income
├── Closing Date
├── Prepayment Penalty
├── Credits
└── Lock Expiration

Rate Lock Information
└── (remaining fields)
```

### Tasks Card Height (After)
```
┌─────────────────────────────┐
│ Tasks              + Add Task│
├─────────────────────────────┤
│ ☐ Task 1                    │
│ ☐ Task 2                    │
│ ☐ Task 3                    │  ← Max height ~280px
│ ☐ Task 4                    │
│ ───────────────────────────│  ← Scroll if more
└─────────────────────────────┘
```
