

# Fix CRM Performance & Complete Account Consolidation

## Current Situation

Your Supabase database is experiencing **severe timeouts** - even basic SELECT queries are failing. This is causing:
- "Creating..." button stuck for 2+ minutes when making new leads
- Previous consolidation SQL failed mid-execution
- General slowness throughout the app

The database is overloaded due to:
1. Missing indexes on frequently-queried tables
2. Sidebar making 5+ parallel COUNT queries on every page load
3. Realtime subscriptions triggering refreshes too frequently
4. Heavy JOINs in lead queries

---

## Phase 1: Emergency Database Fix (Run First)

Run these SQL statements **one at a time** in Supabase SQL Editor to reduce database load immediately.

### Step 1A: Increase Statement Timeout Temporarily
```sql
-- Run this first to allow longer queries
ALTER ROLE authenticator SET statement_timeout = '120s';
```

### Step 1B: Add Critical Performance Indexes (One at a Time)
Run each index separately - if one times out, move to the next:

```sql
-- Index 1: Email suggestions (most impactful)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_suggestions_pending 
ON email_field_suggestions(status) WHERE status = 'pending';
```

```sql
-- Index 2: Lender suggestions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lender_suggestions_pending 
ON lender_field_suggestions(status) WHERE status = 'pending';
```

```sql
-- Index 3: Email logs unread count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_logs_unread 
ON email_logs(direction) WHERE direction = 'In' AND opened_at IS NULL;
```

```sql
-- Index 4: Email automation queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_queue_pending 
ON email_automation_queue(status) WHERE status = 'pending';
```

```sql
-- Index 5: Team feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_unread 
ON team_feedback(is_read_by_admin) WHERE is_read_by_admin = false;
```

```sql
-- Index 6: Contacts pending
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_pending 
ON contacts(approval_status) WHERE approval_status = 'pending';
```

---

## Phase 2: Complete Account Consolidation (After Indexes)

Once indexes are created, run the consolidation in small chunks to avoid timeouts.

### Step 2A: Check Migration Status First
```sql
-- Verify what still needs migrating (should be quick now)
SELECT 
  (SELECT count(*) FROM leads WHERE teammate_assigned IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d')) as leads_remaining,
  (SELECT count(*) FROM tasks WHERE assignee_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d')) as tasks_remaining,
  (SELECT count(*) FROM task_automations WHERE assigned_to_user_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d')) as automations_remaining;
```

### Step 2B: Migrate Data in Chunks
Run each UPDATE separately:

```sql
-- Migrate leads.teammate_assigned
UPDATE leads SET teammate_assigned = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE teammate_assigned IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

```sql
-- Migrate leads.created_by
UPDATE leads SET created_by = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE created_by IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

```sql
-- Migrate tasks.assignee_id
UPDATE tasks SET assignee_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE assignee_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

```sql
-- Migrate tasks.created_by
UPDATE tasks SET created_by = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE created_by IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

```sql
-- Handle task_assignees duplicates first
DELETE FROM task_assignees 
WHERE user_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d')
AND task_id IN (SELECT task_id FROM task_assignees WHERE user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e');
```

```sql
-- Then migrate remaining task_assignees
UPDATE task_assignees SET user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE user_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

```sql
-- Migrate task_automations
UPDATE task_automations SET assigned_to_user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE assigned_to_user_id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

### Step 2C: Upgrade Role & Deactivate Old Accounts
```sql
-- Upgrade .org account to Admin
UPDATE users SET role = 'Admin' WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
```

```sql
-- Deactivate old accounts
UPDATE users SET is_active = false, is_assignable = false
WHERE id IN ('08e73d69-4707-4773-84a4-69ce2acd6a11', 'b06a12ea-00b9-4725-b368-e8a416d4028d');
```

---

## Phase 3: Code Optimization (I'll Implement After SQL)

After you run the SQL, I'll make these code changes:

### 3A: Optimize AppSidebar.tsx
- Replace inline sidebar queries with the existing `useSidebarCounts()` hook
- This reduces database calls from 5+ to 1 cached query

### 3B: Add Timeout Handling to CreateLeadModalModern.tsx
- Add 30-second timeout with user feedback
- Show "Database busy, please retry" instead of infinite spinner

### 3C: Reduce Realtime Subscription Frequency
- Throttle sidebar count refreshes to once per minute
- Consolidate multiple realtime channels

---

## Execution Order

1. **You run Phase 1** - Indexes (do each statement separately)
2. **You run Phase 2** - Consolidation (do each statement separately)  
3. **Tell me** when done
4. **I implement Phase 3** - Code optimizations

---

## Technical Notes

- Using `CREATE INDEX CONCURRENTLY` allows queries to continue while index builds
- Running statements individually prevents cascade timeouts
- The `.org` account (230ccf6d...) will be your single consolidated Admin account
- All 18 task automations will continue working (already assigned to .org)
- The 9 automations on gmail account will be migrated
- Historical data preserved - old accounts just deactivated, not deleted

