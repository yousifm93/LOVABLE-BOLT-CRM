
# Comprehensive Task Automation Fix

## Executive Summary
After a thorough audit of all 60 task automations, I found that only the 14 `loan_status` automations (including the 4 CTC tasks) are currently working after my recent fix. The remaining 46 automations have various issues ranging from incorrect column names to completely missing trigger handlers.

## Issues Found

### 1. Pipeline Stage Changed Automations (8 automations) - BROKEN
**Affected tasks:**
- "Screen new application" (Screening stage) ← This is why your Screening task isn't creating
- "Follow up on pending app" (Pending App stage)
- "New pre-qualified client - Call Borrower" (Pre-Qualified)
- "New pre-qualified client - Call Buyer's Agent" (Pre-Qualified)
- "Home Search Check In (HSCI)" (Pre-Qualified)
- "New pre-approved borrower call" (Pre-Approved)
- "New pre-approved borrower - Call Buyer's Agent" (Pre-Approved)
- "Past client call" (Past Clients)

**Bug:** The function queries for `trigger_type = 'status_changed'` instead of `'pipeline_stage_changed'`, so it finds zero matching automations.

### 2. Appraisal Status Automations (4 automations) - BROKEN
**Affected tasks:**
- "Appraisal Scheduled - Call Buyer's Agent"
- "Appraisal Scheduled - Call Listing Agent"
- "Appraisal Received - Call Buyer's Agent"
- "Appraisal Received - Upload Appraisal Document"

**Bug:** Uses wrong column names (`task_status`, `task_priority`, `assigned_to` instead of `status`, `priority`, `assignee_id`).

### 3. Package Status Automations (3 automations) - BROKEN
**Affected tasks:**
- "Package Final - Final Borrower Call"
- "Package Final - Upload Final Closing Package"
- "Package Finalized - Call Buyer's Agent"

**Bug:** The function queries `trigger_type = 'package_status_change'` but all automations have `trigger_type = 'status_changed'` with `field = 'package_status'`. Will never match.

### 4. Missing Trigger Handlers (5 automations) - NO HANDLER
**These status fields have automations configured but no trigger function exists:**
- `hoi_status` - "Insurance Bound - Upload HOI Policy" 
- `title_status` - "Title Received - Upload Title Work"
- `condo_status` - "Condo Received - Upload Condo Docs"
- `cd_status` - "CD Sent - Upload CD"
- `rate_lock_expiration` - "Rate Locked - Upload Rate Confirmation"

### 5. Other Status Functions (Disclosure, EPO, Lead Created)
- Minor issues with explicit `status`/`priority` in INSERT (should use defaults)
- Missing case-insensitive matching
- EPO uses 'Working on it' status which may not exist

## Technical Solution

### Migration 1: Fix pipeline_stage_changed trigger
```sql
CREATE OR REPLACE FUNCTION execute_pipeline_stage_changed_automations()
-- Key fixes:
-- 1. Query trigger_type = 'pipeline_stage_changed' 
-- 2. Match by target_stage_id instead of stage name
-- 3. Use correct column names (status, priority, assignee_id)
-- 4. Omit status/priority to use DB defaults
-- 5. Add error logging
```

### Migration 2: Fix appraisal_status trigger
```sql
CREATE OR REPLACE FUNCTION execute_appraisal_status_changed_automations()
-- Key fixes:
-- 1. Use correct columns: status, priority, assignee_id
-- 2. Case-insensitive matching
-- 3. Omit status/priority to use defaults
-- 4. Add error logging
```

### Migration 3: Fix package_status trigger
```sql
CREATE OR REPLACE FUNCTION execute_package_status_changed_automations()
-- Key fixes:
-- 1. Query trigger_type = 'status_changed' AND field = 'package_status'
-- 2. Case-insensitive matching
-- 3. Add error logging
```

### Migration 4: Create generic status field handler
```sql
CREATE OR REPLACE FUNCTION execute_generic_status_changed_automations()
-- Handles: hoi_status, title_status, condo_status, cd_status, rate_lock_expiration
-- Creates one trigger that handles all these fields
```

### Migration 5: Fix disclosure_status, epo_status, lead_created triggers
```sql
-- Apply same pattern: omit status/priority, case-insensitive, error logging
```

## Implementation Order
1. First: Fix `execute_pipeline_stage_changed_automations` (will fix Screening)
2. Second: Fix `execute_appraisal_status_changed_automations`
3. Third: Fix `execute_package_status_changed_automations`
4. Fourth: Create generic handler for missing fields
5. Fifth: Fix remaining minor issues

## Verification Strategy
After each fix:
1. Run SQL query to verify trigger function source is updated
2. Change a lead's status to trigger the automation
3. Query `task_automation_executions` to confirm success
4. Query `tasks` to confirm task was created
5. Check UI to confirm task appears

## Expected Outcome
All 60 task automations will work correctly:
- 14 loan_status automations (already fixed)
- 8 pipeline_stage_changed automations (will be fixed)
- 4 appraisal_status automations (will be fixed)
- 6 disclosure_status automations (will be fixed)
- 3 package_status automations (will be fixed)
- 1 epo_status automation (will be fixed)
- 1 lead_created automation (will be fixed)
- 5 generic status automations (will be fixed with new handler)
- 8 date_based automations (separate system, needs verification)
- 7 scheduled automations (separate system, needs verification)
