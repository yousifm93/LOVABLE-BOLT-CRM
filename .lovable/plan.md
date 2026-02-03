
Goal: (1) Stop the “column assigned_to of relation tasks does not exist” error when changing to AWC, (2) remove the redundant “Add Approval Conditions” automation, (3) rename “Intro call” automation to “Intro Call (Borrower)”, and (4) ensure changing loan_status to NEW/RFP moves the deal back to Incoming even when status is changed from inside the lead drawer (not only from the /active list view).

What’s happening now (root causes)
1) The AWC status update is failing because a database trigger function is still trying to insert into a non-existent tasks column:
   - Your screenshot shows: `Update failed: column "assigned_to" of relation "tasks" does not exist`
   - In the most recent migration that redefined the automation trigger functions (20260203185253...), the INSERT statement uses `assigned_to` (wrong) instead of `assignee_id` (correct per your schema).
   - That means any status change that matches automations can crash the lead update transaction, causing “Failed to update loan status” in the UI.

2) The “Incoming vs Live” auto-move logic is currently implemented in /active list view updates, but NOT when changing loan status inside the lead drawer:
   - Active.tsx has logic to set pipeline_section when loan_status changes.
   - ClientDetailDrawer.tsx’s `handleActiveLoanStatusClick` updates only `loan_status` and does not update `pipeline_section`, so your “NEW/RFP always goes back to Incoming” rule isn’t consistently enforced.

3) Task automation configuration changes requested:
   - Delete task automation: “Add Approval Conditions” (id: 32b81e94-c806-437a-97cb-4eb788f8798e)
   - Rename intro call automation currently named/task_name “Borrower intro call” (id: 24061f78-0c74-4ca3-8227-afee9f015de0) to “Intro Call (Borrower)”
   - Keep “Upload initial approval” automation as-is (id: 4923b0ad-24af-4bd1-a3e1-74873297a0a9)

Implementation plan (what I will change)

A) Database: fix the trigger functions so they insert into the correct tasks columns
1) Create a new Supabase migration that redefines the 4 trigger functions:
   - public.execute_loan_status_changed_automations
   - public.execute_disclosure_status_changed_automations
   - public.execute_pipeline_stage_changed_automations
   - public.execute_lead_created_automations

2) In each function, update the tasks INSERT to match your actual tasks table schema:
   - Use `assignee_id` (NOT assigned_to / assigned_to_user_id / assigned_to)
   - Use `priority` with correct casting:
     - `COALESCE(automation_record.task_priority, 'Medium')::task_priority`
   - Set `status` to a valid enum value (we’ll keep `'To Do'::task_status` for consistency with your current workflow)
   - Set `due_date` using `due_date_offset_days`:
     - `CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval`
   - Keep the duplicate-prevention EXISTS check, but ensure it does not reference invalid enum values (we’ll keep the `status::text NOT IN ('Done')` logic you approved earlier).

3) Assignee fallback:
   - If `task_automations.assigned_to_user_id` is null, fallback to your configured default user (the same fallback ID you’ve been using in recent functions).

Expected result:
- Changing loan_status to AWC will no longer fail due to a trigger INSERT error.
- When automations match (AWC), the trigger can successfully create the tasks.

B) Database: apply the task automation configuration changes (delete + rename)
1) Create a second migration section (or include in the same migration) to:
   - DELETE the “Add Approval Conditions” automation:
     - delete from public.task_automations where id = '32b81e94-c806-437a-97cb-4eb788f8798e';
   - RENAME the intro call automation to exactly:
     - task_name = 'Intro Call (Borrower)'
     - name = 'Intro Call (Borrower)'
     - (id = '24061f78-0c74-4ca3-8227-afee9f015de0')

Notes:
- This does not delete any already-created historical tasks; it only stops creating new ones from that automation going forward.

C) Frontend: ensure NEW/RFP always pushes back to Incoming from inside lead details too
1) Update `src/components/ClientDetailDrawer.tsx` in `handleActiveLoanStatusClick`:
   - After computing `dbValue`, include the same pipeline_section automation rules that exist in Active.tsx:
     - If setting to SUB/AWC/CTC: move Incoming -> Live
     - If setting to NEW or RFP: move any non-Closed section -> Incoming
   - Important: ClientDetailDrawer currently maps SUB label to db value 'SUV'. We’ll treat “SUB clicked” as the intent to move to Live.

Expected result:
- Whether you change the loan status from the /active table or from inside the lead drawer, NEW/RFP will consistently move the deal back into Incoming (and SUB/AWC/CTC will move into Live when appropriate).

D) Verification steps (I will run through after implementation)
1) On /active:
   - Change a loan from SUB -> AWC
   - Confirm:
     - No toast error about “assigned_to”
     - The two remaining AWC tasks are created:
       - “Upload initial approval”
       - “Intro Call (Borrower)”
     - “Add Approval Conditions” is not created

2) In lead drawer:
   - Change loan_status from Live section loan to NEW or RFP
   - Confirm it appears back in Incoming after refresh.

3) Optional: Confirm automation execution logs:
   - Check task_automation_executions rows exist for the AWC transition.

Files/areas that will be changed
- supabase/migrations/*.sql (new migration to redefine trigger functions + update automations)
- src/components/ClientDetailDrawer.tsx (add pipeline_section update logic when changing loan_status inside drawer)

Why this will fix the “you said it was fixed but it still errors” problem
- Your current database trigger function definition (from the latest migration) still contains `assigned_to`, which definitively does not exist in your tasks table (your generated types show `assignee_id`).
- Until that’s corrected in the trigger function, any status change that hits that automation path will intermittently fail and surface as “Failed to update loan status”.

Potential edge cases I’ll handle
- Automations with null assigned_to_user_id: fallback user is used.
- Prevent duplicates: keep “don’t recreate if not Done” logic.
- Ensure enum casts are safe: status and priority will be explicitly cast to the right enum types.

