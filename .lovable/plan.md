
# Plan: Add Latest File Update Section to Active Pipeline & Fix Full Name Search

## Summary

Two changes are needed:
1. **Add "Latest File Update" column** to the Active pipeline, positioned above the existing "Pipeline Review" section (matching PendingApp.tsx)
2. **Fix full name search** in sidebar search - currently "David Freed" returns no results because the search queries first_name and last_name separately, but a multi-word search term like "David Freed" needs to search the concatenated full name

---

## Root Cause Analysis

### Search Issue
The current search uses:
```sql
first_name ILIKE '%david freed%' OR last_name ILIKE '%david freed%'
```

This returns **no results** because:
- `first_name` = "David" (doesn't contain "david freed")
- `last_name` = "Freed" (doesn't contain "david freed")

The fix requires searching the concatenated full name:
```sql
(first_name || ' ' || last_name) ILIKE '%david freed%'
```

This correctly returns "David Freed" from buyer_agents.

### Active Pipeline Missing Column
Active.tsx currently has no "Latest File Updates" or "Pipeline Review" column. PendingApp.tsx has both:
- `latestFileUpdates` column (header: "Pipeline Review")
- `notes` column (header: "About the Borrower")

We need to add a similar column to Active.tsx.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AppSidebar.tsx` | Update handleSearch to include full name concatenation search for agents, contacts, and leads |
| `src/pages/Active.tsx` | Add `latest_file_updates` to interface, add column definition, add to default visible columns |

---

## Technical Details

### 1. Fix Sidebar Search (AppSidebar.tsx)

The search queries need to check BOTH:
- Individual fields (first_name, last_name, email, brokerage)
- Concatenated full name for multi-word searches

For Supabase, we can't use SQL concatenation directly in `.or()`, so we need a different approach:

**Option A: Use textSearch (requires setup)**
**Option B: Split the search term and search for each word** (recommended)

When the user types "David Freed", split into ["david", "freed"] and ensure both words match either first_name or last_name:

```typescript
// For agents - split search into words and check each
const searchWords = term.trim().toLowerCase().split(/\s+/);
const firstWord = searchWords[0];
const lastWord = searchWords.length > 1 ? searchWords[searchWords.length - 1] : searchWords[0];

// Query: first_name contains first word AND last_name contains last word
// OR the original single-field searches
```

Actually, the simpler fix is to use a RPC function or just add a filter for the concatenated search. Since Supabase `.or()` doesn't support concatenation, we'll:
1. Keep the existing query for single-word searches
2. For multi-word searches, filter results client-side based on full name match

**Simplified approach**: Run a broader query (increase limit) and then filter client-side by full name:

```typescript
// Search agents
supabase
  .from('buyer_agents')
  .select('id, first_name, last_name, brokerage')
  .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,brokerage.ilike.%${term}%`)
  .is('deleted_at', null)
  .limit(20), // Increase limit to allow filtering

// Then filter in processing:
const normalizedTerm = term.toLowerCase().trim();
agentsResult.data.filter(a => {
  const fullName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
  return fullName.includes(normalizedTerm) ||
         (a.first_name?.toLowerCase().includes(normalizedTerm)) ||
         (a.last_name?.toLowerCase().includes(normalizedTerm)) ||
         (a.brokerage?.toLowerCase().includes(normalizedTerm));
}).slice(0, 5)
```

### 2. Add Latest File Updates Column (Active.tsx)

**Step A: Update ActiveLoan interface** (line ~78)
```typescript
interface ActiveLoan {
  // ... existing fields
  latest_file_updates?: string | null;
  // ... rest
}
```

**Step B: Add column definition** (inside createColumns, before the is_closed column at ~line 864)
```typescript
{
  accessorKey: "latest_file_updates",
  header: "LATEST UPDATE",
  className: "text-left",
  headerClassName: "text-left",
  cell: ({ row }) => (
    <div className="max-w-md text-sm line-clamp-2" title={row.original.latest_file_updates || ''}>
      {row.original.latest_file_updates || '—'}
    </div>
  ),
  sortable: true,
},
```

**Step C: Add to default visible columns** (line ~52)
```typescript
const DEFAULT_MAIN_VIEW_COLUMNS = [
  "borrower_name",
  "team",
  // ... existing columns ...
  "earliest_task_due_date",
  "tasks",
  "latest_file_updates", // NEW - add before or after tasks
];
```

**Step D: Add to column label mapping** (line ~900)
```typescript
const existingMapping: Record<string, string> = {
  // ... existing mappings ...
  "latest_file_updates": "LATEST UPDATE",
};
```

---

## Expected Results

### After Search Fix
- Typing "David Freed" in sidebar search will return:
  - David Freed (from buyer_agents, brokerage: KW)
  - Any matching leads or contacts with "David Freed" in their name

### After Column Addition
- Active pipeline table will show "LATEST UPDATE" column
- Column displays the `latest_file_updates` field content (same as "Pipeline Review" in PendingApp)
- Content is shown as 2-line clipped text with full text on hover

---

## Testing Steps

1. Type "David Freed" in the global sidebar search bar
2. Verify "David Freed" appears in the results (should show as agent type with brokerage "KW")
3. Navigate to /active 
4. Verify "LATEST UPDATE" column appears in the table
5. Click Column Visibility → verify "LATEST UPDATE" is in the list
6. Click on a row to open drawer, verify the field is editable there as well
