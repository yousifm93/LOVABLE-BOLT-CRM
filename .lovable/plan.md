

# Fix: "About the Borrower" Metadata Always Showing "No updates yet"

## Root Cause

The `transformLeadToClient` function in `src/utils/clientTransform.ts` maps `latest_file_updates_updated_at` and `latest_file_updates_updated_by` (lines 273-274) but is missing the equivalent mappings for notes. The fields `notes_updated_at` and `notes_updated_by` are never passed through to the transformed client object, so `(client as any).notes_updated_at` is always `undefined` in the drawer -- causing "No updates yet" to always display.

## Fix

Add two lines to `src/utils/clientTransform.ts` in the `transformLeadToClient` function, right after the existing file updates metadata fields (around line 274):

```
notes_updated_at: lead.notes_updated_at || null,
notes_updated_by: lead.notes_updated_by || null,
```

## Files Modified

| File | Change |
|------|--------|
| `src/utils/clientTransform.ts` | Add `notes_updated_at` and `notes_updated_by` to the transform output (2 lines) |

That's it -- a 2-line fix. The drawer code already handles displaying these fields correctly; they just weren't being passed through from the database query result.
