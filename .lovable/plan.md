
# Fix "Latest File Update" Double Box + Add Metadata to "About the Borrower" + Static Heights

## 3 Changes

### 1. Remove the inner box in "Latest File Update"

The read-only view (line 2172) wraps `FileUpdatesDisplay` inside a `div` that already has `border` and `bg-white rounded-md p-3`. Then `FileUpdatesDisplay` itself also has `border`, `bg-white`, `rounded-md`, and `p-3` -- creating a box within a box.

**Fix**: Replace the wrapper `div` + `FileUpdatesDisplay` with simple inline text rendering (matching how "About the Borrower" does it on line 2112-2113). Remove the redundant wrapper div and render the text directly.

This applies to all stage variants (Leads/Pending App, Screening, Pre-Qualified/Pre-Approved, Active).

### 2. Add "Last updated" metadata to "About the Borrower"

Currently only "Latest File Update" shows the "Last updated" footer. The same footer (timestamp + user) will be added to the "About the Borrower" section. The code for this already exists at lines 2115-2123 -- it just needs to remain visible (it already is for Leads/Pending App). For other stages, verify it's present too.

### 3. Static height with overflow for both sections

Both sections will get a fixed height container for the text display area:
- **About the Borrower**: ~80px height (roughly 1 inch -- slightly smaller as requested)
- **Latest File Update**: ~110px height (roughly 1.5 inches)

When content overflows, it will be clipped with a subtle fade-out gradient at the bottom. Clicking the section opens editing mode where the full content is visible in the textarea (which can scroll).

The read-only display divs will use:
```
h-[80px] overflow-hidden  (About the Borrower)
h-[110px] overflow-hidden (Latest File Update)
```

A subtle bottom gradient overlay will hint that there's more content if it overflows.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/ClientDetailDrawer.tsx` | Remove double-border wrapper on file updates read-only view; add fixed heights to both sections' read-only views; ensure "Last updated" footer on both sections across all stages |

No changes needed to `FileUpdatesDisplay.tsx` since we'll stop using it in the wrapper pattern (rendering text directly instead).

---

## Technical Details

**Before (double box on Latest File Update):**
```tsx
<div className="bg-white rounded-md p-3 text-sm border ...">
  <FileUpdatesDisplay content={localFileUpdates} />  // also has border + bg-white
</div>
```

**After (single box, matching About the Borrower style):**
```tsx
<div className="bg-white rounded-md p-3 text-sm border cursor-pointer hover:border-primary/50 transition-colors h-[110px] overflow-hidden relative" onClick={...}>
  {localFileUpdates.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line || <br />}</p>)}
  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
</div>
```

**About the Borrower read-only (with fixed height):**
```tsx
<div className="bg-white rounded-md p-3 text-sm border ... h-[80px] overflow-hidden relative" onClick={...}>
  {localNotes.split('\n').map(...)}
  <div className="absolute bottom-0 ... bg-gradient-to-t from-white to-transparent ..." />
</div>
```

These changes apply to all 4 stage variants where these sections appear (Leads/Pending App, Screening, Pre-Qualified/Pre-Approved, Active).
