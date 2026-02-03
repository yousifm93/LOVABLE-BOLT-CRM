
## What’s actually going on (root cause)

Your task automations **are firing**, but the trigger functions are **rolling back the task insert**, so you end up with “no tasks”.

The reason is very specific:

- The database trigger functions we edited (`execute_lead_created_automations`, `execute_pipeline_stage_changed_automations`, `execute_disclosure_status_changed_automations`, `execute_loan_status_changed_automations`) currently run this after inserting a task:

  - `UPDATE public.task_automations SET execution_count = ..., last_run_at = now() ...`

- But in your database, **`task_automations` does NOT have `last_run_at` or `execution_count` columns**.
  - It has `last_scheduled_execution` (used for scheduled jobs), and the Admin UI actually computes “Last Run” using the `task_automation_executions` table (not columns on `task_automations`).

So the flow today is:

1) Trigger fires
2) Function inserts task
3) Function tries to update non-existent columns → throws error
4) Error is caught in the `BEGIN … EXCEPTION … END` block → **the whole block is rolled back** (including the task insert)
5) Net result: **no tasks created**, and admin shows no new executions today

This also explains why “Screening” seems like the only thing that “worked”: that behavior is from a different trigger (`auto_complete_followup_on_screening`) that completes tasks; it does not rely on the broken stats update.

---

## Goals (what will work after this fix)

1) **Lead Created** automation:
   - Creates “Follow up on new lead”
   - Due date = today
   - Assigned to the **creator of the lead** (the logged-in user who created it)

2) **Pipeline stage changed** automations:
   - Pending App → “Follow up on pending app”
   - Screening → “Screen new application” (assigned to Herman as configured)
   - Pre-Qualified / Pre-Approved / Active → create all configured tasks

3) **Loan status / disclosure status** automations (Active pipeline status automations):
   - Any configured status changes will create tasks again

4) Admin “Last Run” starts updating again because we’ll insert into:
   - `task_automation_executions`

---

## Implementation approach

### A) Fix the 4 broken trigger functions (DB migration)
Create a new Supabase migration that **replaces** these functions so they:

- Use a valid task status (keep `'To Do'`)
- **Stop updating** non-existent columns on `task_automations`
- Properly **log executions** into `task_automation_executions` (success + error_message on failures)
- Set `tasks.automation_id = automation.id` so each created task is traceable
- Assign tasks correctly:
  - **Lead created**: assignee defaults to **creator CRM user id** if automation is “unassigned”
  - **Stage changed** and **status changed**: assignee defaults to:
    1) automation.assigned_to_user_id (if set)
    2) lead.teammate_assigned (if set)
    3) current actor (CRM user id), if available

Important nuance:
- `NEW.created_by` on leads is an **auth user UUID** (because `set_lead_defaults` sets it from `auth.uid()`).
- `tasks.assignee_id` and `tasks.created_by` are **CRM user IDs** from `public.users.id`.
So the function must map:
- auth user id → CRM user id via `public.users.auth_user_id`.

### B) Confirm the triggers on `public.leads` are present (they are)
Your DB already has:
- `trigger_execute_lead_created_automations` (AFTER INSERT)
- `trigger_pipeline_stage_changed_automations` (AFTER UPDATE OF pipeline_stage_id)
- `trigger_disclosure_status_changed_automations` (AFTER UPDATE OF disclosure_status)
- `trigger_loan_status_changed_automations` (AFTER UPDATE OF loan_status)

So once the function bodies are corrected, automations will resume immediately.

### C) Add a fast verification checklist (DB + UI)
After migration:

**DB verification (most reliable):**
1) Create a lead as Salma → check `tasks` where borrower_id = lead.id
2) Move that lead to Pending App → check tasks again
3) Move to Pre-Qualified → verify multiple tasks inserted
4) Update `loan_status` in Active pipeline → verify tasks inserted for matching automations
5) Verify `task_automation_executions` has rows for each run

**UI verification:**
- Admin → Task Automations: “Last Run” should update to “seconds/minutes ago” (because it’s computed from `task_automation_executions`).

---

## Concrete steps (what I will do once approved in build mode)

1) Create a new SQL migration in `supabase/migrations/` that:
   - `CREATE OR REPLACE FUNCTION public.execute_lead_created_automations() ...`
   - `CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations() ...`
   - `CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations() ...`
   - `CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations() ...`

   Each function will:
   - Insert the task with:
     - `status = 'To Do'`
     - `automation_id = automation.id`
     - `borrower_id = NEW.id`
   - Insert an execution record:
     - success true with task_id
     - on exception: success false with error_message = SQLERRM
   - Not attempt to update `task_automations.last_run_at` / `execution_count`

2) Adjust lead-created assignment rule:
   - Ensure lead-created automation assigns to the **creator’s CRM user id** when automation is unassigned.

3) (Optional but recommended) Add a one-time debug log line (RAISE LOG) inside the pipeline stage function for a couple of days, then remove later. This makes future diagnosis easier if something regresses.

---

## Why this will fix “it worked yesterday but not today”
A recent DB function update introduced references to columns that don’t exist (`last_run_at`, `execution_count`). Because those references are inside the same transaction block as the task insert, the insert is undone. That’s why everything suddenly stopped across multiple trigger types (lead create, stage change, active loan status changes).

---

## Risks / edge cases addressed

- **User mapping missing**: If a logged-in auth user doesn’t have a matching row in `public.users`, we’ll still create tasks but:
  - assignee will fall back to `NEW.teammate_assigned` or automation assignee where possible
  - created_by may be null (or automation.created_by) depending on the trigger
- **Unassigned automations**: lead_created will still assign to creator, per your requirement.
- **Multiple-assignee concept**: tasks support only one assignee; we’ll use the standard primary/creator fallback.

---

## Acceptance criteria (your “done” checklist)

1) Create new lead “Test X” as Yousif:
   - Task “Follow up on new lead” appears immediately
   - Due date = today
   - Assigned to Yousif

2) Move that lead to Pending App:
   - “Follow up on pending app” appears

3) Move to Pre-Qualified / Pre-Approved / Active:
   - The configured tasks appear for each stage

4) Change Active pipeline statuses (loan_status / disclosure_status):
   - Matching configured tasks appear

5) Admin → Task Automations:
   - Last Run updates today (because executions are being logged)

