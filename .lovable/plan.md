

# Fix: Consistent Sizing, Always-Visible Metadata, No Expand/Collapse for Notes Sections

## Issues Found

1. **Inconsistent heights**: "About the Borrower" is `h-[80px]` while "Latest File Update" is `h-[110px]` -- they should both be `h-[110px]`
2. **Missing metadata on many leads**: The metadata footer ("Last updated...") only shows when `notes_updated_at` or `latest_file_updates_updated_at` exists in the database. Leads that were saved before the metadata tracking was added (or never edited since) have no metadata -- this is expected but can be confusing
3. **Gradient fade overlay is unwanted**: The bottom gradient fade suggests expandability -- user doesn't want expand/collapse behavior
4. **Textarea should be scrollable at fixed height, not expandable**: When clicking to edit, the textarea should stay the same fixed size (h-[110px]) with internal scrolling, not grow with content
5. **Active stage uses a different component (MentionableInlineEditNotes)** for both "About the Borrower" and "Latest File Update" -- these also need the same fixed height treatment

## Changes

All in `src/components/ClientDetailDrawer.tsx`:

### 1. Make both sections the same height (h-[110px])

Change all "About the Borrower" read-only views from `h-[80px]` to `h-[110px]` to match "Latest File Update". This affects 4 locations:
- Line 2112 (Leads/Pending App)
- Line 2270 (Screening)
- Line 2383 (Pre-Qualified/Pre-Approved)
- Line 2848 (Active/Past Clients)

### 2. Remove the gradient fade overlay

Remove the `<div className="absolute bottom-0 ... bg-gradient-to-t ...">` from all read-only views (8 instances -- 4 for notes, 4 for file updates). The box just clips content; no visual hint of "more" needed.

### 3. Make textarea editing mode the same fixed height with scroll

Change all textarea `min-h-[130px]` and `min-h-[100px]` classes to `h-[110px]` with `overflow-y-auto` so the editing mode matches the read-only size exactly. The box never changes size -- users scroll within it.

### 4. Always show metadata footer (even when no timestamp exists)

Currently the metadata only renders when `notes_updated_at` is truthy. Change the conditional so the footer always renders:
- If timestamp exists: show "Last updated: [date] - [user]"
- If no timestamp: show "No updates yet" in muted text

This ensures every lead always has a visible metadata footer.

### 5. Fix Active stage sections

The Active stage uses `MentionableInlineEditNotes` with `min-h-[140px]` / `min-h-[120px]`. Wrap these in a fixed `h-[110px] overflow-y-auto` container so they match the other stages.

## Technical Details

Locations to update (line numbers from current file):

| Section | Stage | Lines | Changes |
|---------|-------|-------|---------|
| About the Borrower | Leads/Pending App | ~2094-2125 | h-[110px], remove gradient, fix textarea height, always show metadata |
| Latest File Update | Leads/Pending App | ~2143-2191 | same height fixes, remove gradient, always show metadata |
| About the Borrower | Screening | ~2252-2283 | same |
| Latest File Update | Screening | ~2301-2348 | same |
| About the Borrower | Pre-Qual/Pre-Approved | ~2365-2395 | same |
| Latest File Update | Pre-Qual/Pre-Approved | ~2423-2470 | same |
| Latest File Update | Active | ~2709-2729 | fixed h-[110px] container, always show metadata |
| About the Borrower | Active/Past Clients | ~2830-2860 | fixed h-[110px], remove gradient, fix textarea, always show metadata |

