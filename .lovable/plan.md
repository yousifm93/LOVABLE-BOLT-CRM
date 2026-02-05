
# Remove Juan Diego and Reassign to Yousif Mohamed

## Overview

This plan will:
1. Reassign all of Juan Diego's tasks to Yousif Mohamed (LO)
2. Update leads where Juan Diego is the teammate_assigned
3. Delete Juan Diego's user record

---

## User IDs

| User | ID | Role |
|------|-----|------|
| Juan Diego | `31e7f1ae-8021-4214-841e-c7d440789fe3` | LO Assistant |
| Yousif Mohamed | `230ccf6d-48f5-4f3c-89fd-f2907ebdba1e` | LO |

---

## Execution Steps

### Step 1: Reassign Task Assignments
Update `task_assignees` table to replace Juan Diego with Yousif Mohamed:

```sql
UPDATE task_assignees 
SET user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE user_id = '31e7f1ae-8021-4214-841e-c7d440789fe3';
```

### Step 2: Reassign Leads
Update `leads` table where Juan Diego is the teammate:

```sql
UPDATE leads 
SET teammate_assigned = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE teammate_assigned = '31e7f1ae-8021-4214-841e-c7d440789fe3';
```

### Step 3: Delete User Record
Remove Juan Diego from the `users` table:

```sql
DELETE FROM users 
WHERE id = '31e7f1ae-8021-4214-841e-c7d440789fe3';
```

---

## Impact Summary

| Table | Records Affected | Action |
|-------|------------------|--------|
| `task_assignees` | 3 tasks | Reassign to Yousif |
| `leads` | 3 leads | Reassign teammate to Yousif |
| `users` | 1 record | Delete Juan Diego |

---

## Result

After execution:
- Juan Diego will no longer appear in user dropdowns or assignment lists
- His 3 tasks will now be assigned to Yousif Mohamed
- His 3 leads will have Yousif as the teammate
- All historical references (activity logs, etc.) may show orphaned user IDs but this is acceptable for removed employees
