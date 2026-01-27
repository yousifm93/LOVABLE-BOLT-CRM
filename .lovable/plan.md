
Goal
- When a user attaches an image to a Note:
  1) The image reliably shows later when opening the Note Details
  2) The image also appears in the Lead “Documents” section (under Images)

What’s happening now (root causes)
1) The attachment is being saved to `notes.attachment_url`, but it is not being passed through to the UI:
   - In `src/components/ClientDetailDrawer.tsx`, `loadActivities()` transforms raw DB rows into the `ActivityTab` shape.
   - That transform currently does NOT include `attachment_url` in the returned object (it returns many fields, but not `attachment_url`), so `ActivityTab` and `NoteDetailModal` never receive it, even though the database row has it.

2) The note attachment upload does not create a “documents” table record, so it will never show up in the Documents section:
   - `AddNoteModal` in `src/components/modals/ActivityLogModals.tsx` uploads the file directly to Supabase Storage and stores a URL in the note.
   - The “Documents” section is driven by rows in the `public.documents` table (loaded via `databaseService.getLeadDocuments()`), not by “anything in Storage”.
   - So unless we insert into `public.documents`, it won’t show in Documents.

3) Optional/likely: URL vs storage-path mismatch (robustness)
   - The current upload code stores a `publicUrl` from `getPublicUrl(...)`.
   - If the bucket is not public (common), the URL may render in some contexts inconsistently or fail depending on auth/session, and we can end up with broken images.
   - The rest of the app (Documents preview) already supports “storage path” → “signed URL” via `databaseService.getDocumentSignedUrl()`. We should reuse that approach for activity attachments too.

Implementation approach (high level)
- Store note attachments as:
  - A proper `public.documents` record (so it shows in Documents)
  - A storage path in `notes.attachment_url` (not a public URL)
- Whenever we display an attachment:
  - If the stored value is a storage path (does not start with `http`), generate a signed URL before rendering the `<img src=...>`

Concrete code changes

A) Ensure activities include attachment_url when displayed
File: `src/components/ClientDetailDrawer.tsx`
- In `loadActivities()` mapping (the large `transformedActivities` map):
  - Add `attachment_url: activity.attachment_url` to the return object for all activity types (at minimum for note/call/sms/email).
  - This ensures `ActivityTab` receives it and can pass it into `NoteDetailModal`.

Why this matters
- Right now the note detail modal renders `note.attachment_url`, but the object it receives doesn’t include it due to the transformation dropping it.

B) Make “Add Note” attachment also create a Documents record
File: `src/components/modals/ActivityLogModals.tsx` (AddNoteModal)
- Replace the direct `supabase.storage.from('documents').upload(...)` approach with the existing helper:
  - Use `databaseService.uploadLeadDocument(leadId, file, { source: 'activity_attachment', title: file.name })`
  - This will:
    1) Upload to storage
    2) Insert into `public.documents`
  - Then set `attachmentUrl` to the returned document’s `file_url` (storage path), not the public URL.

Additional small UI improvement
- If desired: show a mini preview using a signed URL, but not required for correctness.

C) Render attachments using signed URLs (so they always load)
Files:
- `src/components/modals/NoteDetailModal.tsx`
- `src/components/lead-details/ActivityTab.tsx` (the inline attachment preview inside the activity collapsible)

Changes
1) Add a small resolver function/hook in each component (or a shared helper) that:
   - If `attachment_url` starts with `http`, use it as-is
   - Else call `databaseService.getDocumentSignedUrl(attachment_url)` and store in local state
2) Use the resolved URL for `<img src="...">` and `<a href="...">`

Why this matters
- If the storage bucket is not public, `publicUrl` won’t reliably display.
- Signed URLs are the established pattern already used elsewhere in this codebase.

D) Confirm Documents tab grouping includes this new source
File: `src/components/lead-details/DocumentsTab.tsx`
- The Documents tab already puts anything not `condition` and not `email_attachment` into “Other” and then “Images/PDFs/Other Files” based on MIME type.
- Since we’ll upload with `mime_type` set to the file’s type and `source: 'activity_attachment'`, it will automatically appear under Images.
- Optional: add a display label for this new source (badge could show “Manual” today; we can add “Activity” if you want it explicit).

Verification checklist (what we’ll test)
1) Add a note + attach an image + click Save
2) Reopen the same note from Activity list:
   - The image appears in the Note Details modal
   - The image appears in the Activity list inline preview (if expanded)
3) Go to Documents tab:
   - The image appears under Images with a source badge (either “Manual” or “Activity” if we add that label)
4) Confirm this works after refresh and for other users on the account (not just the uploader)

Potential edge cases handled
- Existing notes that stored `publicUrl` (starts with `http`) will still render because we’ll support both http URLs and storage paths.
- If a note has an attachment but the file is deleted from storage later, we’ll show a broken image; optionally we can add a “Could not load attachment” fallback.

Files to change
- `src/components/ClientDetailDrawer.tsx` (pass through attachment_url)
- `src/components/modals/ActivityLogModals.tsx` (upload note attachment via databaseService.uploadLeadDocument + store storage path)
- `src/components/modals/NoteDetailModal.tsx` (resolve signed URL for attachment before rendering)
- `src/components/lead-details/ActivityTab.tsx` (resolve signed URL for inline attachment preview)
- (Optional) `src/components/lead-details/DocumentsTab.tsx` (label “Activity” source badge)

Expected outcome
- Note attachments always show when opening notes later
- Note attachments also appear in the Lead Documents section automatically
