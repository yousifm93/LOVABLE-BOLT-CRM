

# Consolidate Yousif Accounts into yousif@mortgagebolt.org

## Overview

This plan consolidates your three accounts into the `yousif@mortgagebolt.org` account and upgrades it from LO to Admin role.

---

## Current Account Status

| Email | User ID | Role | Assignable | Auth Login |
|-------|---------|------|------------|------------|
| yousif@mortgagebolt.org | `230ccf6d-...` | LO | Yes | Yes |
| yousifminc@gmail.com | `08e73d69-...` | Admin | No | Yes |
| yousif@mortgagebolt.com | `b06a12ea-...` | Admin | No | Yes |

---

## Complete Dependency Analysis

### Database Records to Migrate

| Table/Field | .org Account | gmail Account | .com Account |
|-------------|--------------|---------------|--------------|
| leads.teammate_assigned | 17 | 23 | 38 |
| leads.created_by | 0 | 111 | 841 |
| tasks.assignee_id | 267 | 283 | 2 |
| tasks.created_by | 1 | 444 | 86 |
| task_assignees | 120 | 157 | 1 |
| task_automations | **18** | 9 | 0 |
| email_logs.user_id | 0 | 1 | 0 |
| assistant_chat_sessions | 0 | 6 | 0 |

### Hardcoded References in Code

The following files have the `.org` account ID hardcoded:

1. **src/services/database.ts** (line 1159) - Default task assignee fallback
2. **src/components/modals/CreateNextTaskModal.tsx** (line 21) - Default assignee
3. **src/pages/Email.tsx** (lines 200-201) - Email inbox mapping
4. **Multiple migration files** - Fallback user IDs in database triggers

**Benefit**: Since we're consolidating INTO the `.org` account, these hardcoded references will remain valid - no code changes needed.

### Task Automations Impact

- **18 automations** assigned to `.org` account (will continue working)
- **9 automations** assigned to gmail account (need to be migrated)
- **0 automations** assigned to `.com` account

### RLS Policies

The system uses `auth.uid()` for permission checks. After migration:
- You'll log in with `yousif@mortgagebolt.org` credentials
- The `.org` account's `auth_user_id` will be used for all RLS checks
- Changing role to Admin will give you full Admin access via existing RLS policies

---

## What Will Still Work

- All task automations (18 remain as-is, 9 get reassigned)
- Email inbox access (hardcoded to `.org` account ID)
- Default task assignment (hardcoded to `.org` account ID)
- Admin features (role will be upgraded to Admin)
- Assignment dropdowns (is_assignable stays true)

## What We Need to Do

### Step 1: Migrate Data from Other Accounts

```sql
-- Migrate leads.teammate_assigned
UPDATE leads SET teammate_assigned = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE teammate_assigned IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');

-- Migrate leads.created_by (keep historical record, or migrate)
UPDATE leads SET created_by = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE created_by IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');

-- Migrate tasks
UPDATE tasks SET assignee_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE assignee_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');

UPDATE tasks SET created_by = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE created_by IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');

-- Migrate task_assignees
UPDATE task_assignees SET user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE user_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');

-- Migrate task_automations
UPDATE task_automations SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE assigned_to_user_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

### Step 2: Upgrade Role to Admin

```sql
UPDATE users SET role = 'Admin' WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
```

### Step 3: Deactivate Other Accounts

```sql
UPDATE users SET is_active = false, is_assignable = false
WHERE id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

---

## Post-Migration

After this migration:
- Log in with `yousif@mortgagebolt.org` for all CRM access
- Full Admin permissions
- Can still be assigned to tasks/leads
- All automations will work
- All historical data preserved under one account
- Old accounts deactivated but not deleted (preserves audit trail)

---

## Risks Mitigated

| Risk | Mitigation |
|------|------------|
| Breaking automations | 18 automations already use `.org` ID - no change needed |
| Losing Admin access | Role upgraded to Admin before deactivating other accounts |
| Can't assign yourself | is_assignable remains true on `.org` account |
| Code hardcoded IDs | All hardcoded IDs reference `.org` account - no code changes |
| Email inbox access | USER_ACCOUNT_MAP already maps `.org` ID to Yousif inbox |

