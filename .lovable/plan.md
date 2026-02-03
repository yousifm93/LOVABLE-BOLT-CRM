
## Goals (what you’ll get)
1. Clicking *any* top-left sidebar search result (Lead, Agent, Lender, Master Contact, Past Client/Idle/etc) will:
   - Navigate to the correct page **and**
   - Automatically open that specific record (drawer/dialog) immediately.
2. The **Active-stage “Latest File Update”** card will:
   - Be larger (similar height/feel to Pipeline Review, roughly ~70% of “About the Borrower”)
   - Show **Last updated date/time + who updated it** at the bottom (same pattern as Pipeline Review).
3. Tasks that still show **“Assign to…”** will be **actually assigned in the database** (not just visually):
   - Any task missing assignees will be assigned to the user(s) from the **most recent task on that same file (borrower_id)**.
4. Fix “Failed to move lead to Idle”:
   - Current failure is caused by a database trigger referencing a non-existent field `OLD.pipeline_stage`.

---

## What I found (root causes)

### A) Search result click: only some pages “auto-open”
- The sidebar search already navigates with query params like:
  - `?openLead=...`, `?openAgent=...`, `?openLender=...`, `?openContact=...`
- Agents/Lenders/Contacts pages now correctly read those params and open the drawer/dialog.
- **But most pipeline pages (Pending App, Screening, Pre-Qualified, Pre-Approved, Past Clients) do not implement `openLead` handling**, so clicking a Lead/Past Client result takes you to the page but doesn’t open the record.

### B) Past Clients routing mismatch in sidebar search
- In `AppSidebar.tsx`, `PIPELINE_STAGE_NAMES` contains Past Clients stage id:
  - `acdfc6ba-7cbc-47af-a8c6-380d77aef6dd`
- But `getPipelineRoute()` uses a different id (`e9fc7eb8-...`) for `/past-clients`.
- Result: Past Clients leads can route incorrectly (often back to `/leads`).

### C) Idle transition failure is definitely backend (database trigger)
From your browser network logs, the PATCH to `leads` fails with:
- **400** and message: `record "old" has no field "pipeline_stage"`

This means a **Postgres trigger function on the `leads` table** is referencing `OLD.pipeline_stage`, but the `leads` table uses `pipeline_stage_id` (uuid). So *any* stage move (including to Idle) can fail depending on which trigger version is active.

### D) Tasks “Assigned To” still blank because we only added display fallback
- `TasksModern.tsx` currently *displays* a fallback assignee when missing.
- But it does **not** persist assignments to the database.
- So you still see tasks with “Assign to…” because:
  - Some borrowers have no other tasks loaded with assignees (or the “most recent assigned task” isn’t in the current filtered list), and/or
  - Nothing is actually backfilled server-side.

---

## Implementation Plan (code + database)

### 1) Make search-click open *every* entity (including every pipeline stage lead)
**Files to update**
- `src/pages/PendingApp.tsx`
- `src/pages/Screening.tsx`
- `src/pages/PreQualified.tsx` (or `PreQualified.tsx` naming used in your repo)
- `src/pages/PreApproved.tsx`
- `src/pages/PastClients.tsx`

**Change**
- Add the same `useSearchParams` + `useEffect` pattern used in `Leads.tsx` / `Active.tsx`:
  - Read `openLead`
  - If the lead exists in the current list, open drawer
  - If not, fetch it by id (`databaseService.getLeadByIdWithEmbeds(openLeadId)` or a direct supabase query like in `Leads.tsx`)
  - Clear the query param after opening

**Result**
- Clicking a Lead from sidebar search will always open the drawer regardless of which pipeline stage page it belongs to.

---

### 2) Fix Past Clients pipeline route mapping in sidebar search
**File to update**
- `src/components/AppSidebar.tsx`

**Change**
- Update `getPipelineRoute()` so Past Clients uses the correct stage id:
  - Add route map entry for `acdfc6ba-7cbc-47af-a8c6-380d77aef6dd` → `/past-clients`
- Optionally remove/replace the incorrect `e9fc7eb8-...` entry if it’s legacy.

**Result**
- Past Clients search results navigate to `/past-clients?openLead=...` correctly.

---

### 3) Make the Active “Latest File Update” match the larger style + show updated metadata
**File to update**
- `src/components/ClientDetailDrawer.tsx` (Active section currently around the “Latest File Update” card)

**Changes**
- Replace the minimal `MentionableInlineEditNotes` block with a layout closer to the other “big text box” sections:
  - Use a `Textarea` (or keep mentions, but adjust layout so the visible area is larger)
  - Target height: around `min-h-[140px]` to `min-h-[170px]` (so it’s clearly larger than now but smaller than “About the Borrower” which is ~210px)
- Add the same footer line currently shown under Pipeline Review:
  - Show `(client as any).latest_file_updates_updated_at`
  - Show `fileUpdatesUpdatedByUser` name (already used by Pipeline Review) or fetch it if needed
- Keep it positioned between **Send Email Templates** and **Pipeline Review** as it is now.

**Result**
- Bigger box, consistent feel, and always shows who/when last updated.

---

### 4) Actually assign unassigned tasks using “most recent task on the same file”
**File to update**
- `src/pages/TasksModern.tsx`

**Approach**
- Add a backfill step after tasks are loaded (and ideally only for Admins):
  1. Identify tasks with:
     - no `assignee_ids` (empty/undefined) AND no `assignee_id`
     - has a `borrower_id`
  2. For each such task, compute fallback assignee(s) from the most recent task for that borrower that has assignees.
     - Use the full `tasks` array (not filtered) to find the most recent by `updated_at` or `created_at`
  3. Persist to DB:
     - Update `tasks.assignee_ids` (preferred) and set `tasks.assignee_id` to the first id for compatibility
  4. Update local state after persistence to remove “Assign to…” immediately.

**Edge cases**
- If a borrower truly has no tasks with assignees, then:
  - Fall back to the global fallback user (YM) if that matches your current rule, or
  - Leave it unassigned (I’ll implement the YM fallback if you confirm you want that behavior here too)

**Result**
- The column stops showing blanks because the tasks are now truly assigned in the database.

---

### 5) Fix “Failed to move lead to Idle” (database trigger bug)
**What’s broken**
- A trigger function (current active version) uses:
  - `IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN`
- But `leads` doesn’t have `pipeline_stage`.

**Fix**
- Create a new migration that:
  1. Replaces the broken `execute_pipeline_stage_changed_automations()` with a correct version that uses:
     - `OLD.pipeline_stage_id` / `NEW.pipeline_stage_id`
  2. When it needs a stage name (for comparing to automation config), it will:
     - Lookup stage names from `pipeline_stages` using the ids
     - Compare `new_stage_name::text` to the automation’s configured target
  3. Ensure the trigger is attached to:
     - `AFTER UPDATE OF pipeline_stage_id ON public.leads`

**Why this will fix Idle**
- Your Idle move is a simple update to `leads.pipeline_stage_id`.
- The database error happens before the update can complete.
- Fixing that trigger removes the 400 error, and the UI will succeed.

**Validation**
- After deploying migration, I’ll re-test moving a lead to Idle and confirm the PATCH is 200.

---

## Testing checklist (I will do before finishing)
1. **Search deep link open**
   - Search a Lead in each stage (Leads, Pending App, Screening, Pre-Qualified, Pre-Approved, Active, Past Clients, Idle)
   - Click result → correct page loads and drawer opens
2. **Past Clients route**
   - Search a Past Client lead → ensure it routes to `/past-clients` (not `/leads`)
3. **Active Latest File Update UI**
   - Open an Active lead → confirm box size increased and footer shows last updated timestamp + user
   - Edit/save → confirm it persists and footer updates
4. **Task assignments backfill**
   - Open Tasks → verify previously blank “Assigned To” rows become assigned
   - Refresh page → verify assignments persist (DB updated)
5. **Idle move**
   - From lead drawer, move to Idle → confirm success toast and lead appears in Idle pipeline

---

## Files / areas that will change
**Frontend**
- `src/components/AppSidebar.tsx` (Past Clients stage id route mapping)
- `src/pages/PendingApp.tsx` (add `openLead` handling)
- `src/pages/Screening.tsx` (add `openLead` handling)
- `src/pages/PreQualified.tsx` (add `openLead` handling)
- `src/pages/PreApproved.tsx` (add `openLead` handling)
- `src/pages/PastClients.tsx` (add `openLead` handling)
- `src/components/ClientDetailDrawer.tsx` (Active Latest File Update UI + footer)
- `src/pages/TasksModern.tsx` (persist backfill of missing assignees)

**Database**
- New migration: fix `execute_pipeline_stage_changed_automations()` so it uses `pipeline_stage_id` + stage name lookup, removing `OLD.pipeline_stage` reference.

---

## One quick confirmation (so I implement exactly what you want)
For tasks that are unassigned and there is no “most recent assigned task” for that borrower:
- Should we default to **YM (Yousif Mohamed)** like other fallbacks, or leave it unassigned?

I can implement YM fallback by default if you want consistency with the rest of the CRM.
