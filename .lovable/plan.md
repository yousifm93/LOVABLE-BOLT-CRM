

# User Management & Processor Role Updates

## Overview
Two changes requested:
1. **User Management Page**: Add an "Inactive" section to display deactivated users separately from Active Admins and Team Members
2. **Processor Role Sidebar**: Instead of showing hidden/locked navigation items, completely remove non-applicable sections from the sidebar for Processors (only show: Home, Tasks, Email, Active, Feedback)

---

## Change 1: Inactive Users Section

### Current Behavior
- Users are split into "Admins" and "Team Members" tables
- Inactive users show with an "Inactive" badge in their respective sections

### New Behavior
- Add third section: **"Inactive"** below Team Members
- Move all users where `is_active === false` to this section
- Keep same table columns and actions

### File Modified
**src/pages/UserManagement.tsx**

### Implementation
```text
1. Update user filtering:
   - adminUsers = active Admins only
   - teamMembers = active non-Admins only  
   - inactiveUsers = all inactive users (any role)

2. Add new Card section after Team Members:
   - Title: "Inactive"
   - Description: "Deactivated users who no longer have access"
   - Same table structure with Name, Email, Phone, Role, Actions
```

---

## Change 2: Processor Role - Remove Hidden Sections Entirely

### Current Behavior
- Permissions use three levels: `visible`, `hidden`, `locked`
- `hidden` items are filtered out via `filterItemsByPermission()`
- Ashley (Processor) has most sections set to `hidden` or `locked`
- Some sections still show as locked with lock icon

### Goal
For Processors, completely hide everything except:
- Home
- Tasks
- Email
- Active (pipeline)
- Feedback

All other navigation groups (Dashboard, other Pipeline items, Contacts, Resources, Calculators, Admin) should not appear at all.

### Implementation Approach
This is already handled by the permission system! When a section is set to `'hidden'`, it's filtered out by `filterItemsByPermission()`. The issue is that some sections may be set to `'locked'` instead of `'hidden'`.

**Solution**: Update Ashley's permissions (and establish as template for Processor role) to set all non-applicable sections to `'hidden'` rather than `'locked'`.

### SQL to Run in Supabase
Find Ashley's user_id and update her permissions:

```sql
-- First, get Ashley's user_id
SELECT id, first_name, role FROM users WHERE first_name = 'Ashley' AND role = 'Processor';

-- Update permissions to hide (not lock) non-applicable sections
UPDATE user_permissions 
SET 
  -- Dashboard hidden (not locked)
  dashboard = 'hidden',
  -- Pipeline - hide all except Active
  pipeline_leads = 'hidden',
  pipeline_pending_app = 'hidden',
  pipeline_screening = 'hidden',
  pipeline_pre_qualified = 'hidden',
  pipeline_pre_approved = 'hidden',
  -- pipeline_active stays 'visible'
  pipeline_past_clients = 'hidden',
  pipeline_idle = 'hidden',
  -- Contacts - all hidden
  contacts = 'hidden',
  contacts_agents = 'hidden',
  contacts_borrowers = 'hidden',
  contacts_lenders = 'hidden',
  -- Resources - all hidden
  resources = 'hidden',
  resources_bolt_bot = 'hidden',
  resources_email_marketing = 'hidden',
  resources_condolist = 'hidden',
  resources_preapproval = 'hidden',
  -- Calculators - all hidden
  calculators = 'hidden',
  calculators_loan_pricer = 'hidden',
  calculators_property_value = 'hidden',
  calculators_income = 'hidden',
  calculators_estimate = 'hidden',
  -- Admin - already hidden
  admin = 'hidden'
WHERE user_id = (SELECT id FROM users WHERE first_name = 'Ashley' AND role = 'Processor');
```

### Code Change: Sidebar Group-Level Filtering
**src/components/AppSidebar.tsx**

Currently the sidebar shows section groups (Pipeline, Contacts, Resources, etc.) even when all child items are hidden. We need to add group-level filtering.

```text
1. Add helper function to check if any items in a group are visible
2. Wrap each CollapsibleSidebarGroup in conditional rendering:
   - Only render Pipeline group if at least one pipeline item is visible
   - Only render Contacts group if at least one contact item is visible
   - etc.
```

---

## Technical Details

### UserManagement.tsx Changes
- Line ~54-55: Update filtering logic
- Add new `inactiveUsers` array
- Add third Card section (~lines 385-430)

### AppSidebar.tsx Changes
- Add `hasAnyVisible()` helper function
- Wrap each sidebar group section in conditional rendering
- Approximately lines 600-800 where groups are rendered

---

## Summary

| Task | Type | Effort |
|------|------|--------|
| Add Inactive section to User Management | Code change | Small |
| Update Processor permissions | SQL in Supabase | One-time |
| Add group-level filtering to Sidebar | Code change | Medium |

These changes ensure:
1. Inactive users are visually separated in User Management
2. Processors see a clean, minimal sidebar with only their relevant sections
3. Future Processors automatically get the same experience via the permission system

