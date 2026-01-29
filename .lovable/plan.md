

# Plan: Duplicate Detection & Public Website Enhancements

## Summary

This plan addresses three requests:
1. **Detect and label duplicates** in the condo list (by building name or address)
2. **Show only the "best" record** on the public website (lowest down payments)
3. **Add "Mortgage Bolt has closed in this building before"** message to the public website detail view

---

## Current Duplicate Status

| Finding | Count |
|---------|-------|
| Unique condo names with duplicates | 51 |
| Total duplicate rows | 106 |
| Duplicates by address | 22 |

**Example: Brickell Flatiron has 2 entries:**
| ID | Review Type | Primary Down | Street Address |
|----|-------------|--------------|----------------|
| b670698e... | Conventional Limited | 10% | 1000 Brickell Plaza |
| 9eeb8807... | Restricted | null | 1000 Brickell Plaza |

The first entry should be shown on the public website (has down payments), the second should be hidden.

---

## Solution Overview

### Part 1: Add Duplicate Column to Database

Add a new `is_duplicate` boolean column to mark duplicate entries:

```sql
ALTER TABLE condos ADD COLUMN is_duplicate boolean DEFAULT false;
```

### Part 2: Create Duplicate Detection Logic

Run a SQL update to mark duplicates based on:
1. **Same normalized name** (case-insensitive, trimmed)
2. Keep the "best" record unmarked (lowest primary_down percentage)
3. Mark all others as `is_duplicate = true`

**Ranking logic for "best" record:**
1. Has `primary_down` value (not null)
2. Lowest `primary_down` percentage (3% is better than 10%)
3. If tied, prefer `review_type = 'Conventional Full'`
4. If still tied, use most recent `updated_at`

### Part 3: Add Duplicate Column to CRM UI

Add a "Duplicate" column to the Condolist table showing:
- Badge with "Duplicate" for entries where `is_duplicate = true`
- Allow filtering by duplicate status

### Part 4: Update Public API to Exclude Duplicates

Modify `public-condo-search` edge function to:
1. Filter out records where `is_duplicate = true`
2. Exclude `Restricted` review type (not financeable)
3. Continue to include `past_mb_closing` field

### Part 5: Add "Closed Before" Message to Website

Update the public condo search response to include `pastMbClosing` flag (already done), then:

On mortgagebolt.org, update the detail modal to show:

```text
*Information is subject to change. Please contact Mortgage Bolt for more details.

✓ Mortgage Bolt has closed in this building before.    <-- NEW (conditional)

[Get a Quote for This Building]  [Request Marketing Material]
```

---

## Implementation Details

### Database Migration

```sql
-- Add is_duplicate column
ALTER TABLE condos ADD COLUMN is_duplicate boolean DEFAULT false;

-- Mark duplicates (keep best record per normalized name)
WITH ranked_condos AS (
  SELECT 
    id,
    condo_name,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(condo_name))
      ORDER BY 
        CASE WHEN primary_down IS NOT NULL THEN 0 ELSE 1 END,
        CAST(REGEXP_REPLACE(COALESCE(primary_down, '999'), '[^0-9]', '', 'g') AS INTEGER),
        CASE WHEN review_type = 'Conventional Full' THEN 0 
             WHEN review_type = 'Conventional Limited' THEN 1
             WHEN review_type = 'Non-QM Full' THEN 2
             WHEN review_type = 'Non-QM Limited' THEN 3
             ELSE 4 END,
        updated_at DESC
    ) as rank
  FROM condos
  WHERE deleted_at IS NULL
)
UPDATE condos
SET is_duplicate = true
WHERE id IN (
  SELECT id FROM ranked_condos WHERE rank > 1
);
```

### CRM Condolist Changes

**File:** `src/pages/resources/Condolist.tsx`

1. Add to Condo interface:
```typescript
is_duplicate: boolean | null;
```

2. Add duplicate column to table:
```typescript
{
  accessorKey: "is_duplicate",
  header: "Status",
  cell: ({ row }) => (
    row.original.is_duplicate ? (
      <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
        Duplicate
      </Badge>
    ) : null
  ),
}
```

3. Add duplicate filter:
```typescript
const [duplicateFilter, setDuplicateFilter] = useState<string>("all");

// In filter section:
<Select value={duplicateFilter} onValueChange={setDuplicateFilter}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="Duplicates" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Records</SelectItem>
    <SelectItem value="duplicates">Duplicates Only</SelectItem>
    <SelectItem value="unique">Unique Only</SelectItem>
  </SelectContent>
</Select>
```

### Public API Changes

**File:** `supabase/functions/public-condo-search/index.ts`

Add filters to exclude duplicates and restricted condos:

```typescript
let query = supabase
  .from('condos')
  .select('condo_name, street_address, city, state, zip, primary_down, second_down, investment_down, source_uwm, source_ad, past_mb_closing')
  .eq('is_duplicate', false)  // Only show unique/best records
  .neq('review_type', 'Restricted')  // Exclude non-financeable
  .is('deleted_at', null)  // Exclude soft-deleted
  .limit(Math.min(limit, 50));
```

### Website Integration Note

The `pastMbClosing` field is already included in the API response. On mortgagebolt.org, update the detail modal to conditionally show:

```html
<p class="text-gray-500 text-sm italic">
  *Information is subject to change. Please contact Mortgage Bolt for more details.
</p>

<!-- Conditional: Only show if pastMbClosing is true -->
<p class="text-green-600 text-sm font-medium flex items-center gap-1 mt-2">
  ✓ Mortgage Bolt has closed in this building before.
</p>
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| Database migration | Add `is_duplicate` column and populate |
| `src/pages/resources/Condolist.tsx` | Add duplicate column and filter |
| `src/components/CondoDetailDialog.tsx` | Show duplicate badge in detail view |
| `supabase/functions/public-condo-search/index.ts` | Filter out duplicates and restricted |
| `src/integrations/supabase/types.ts` | Updated automatically |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Total condos | 2,404 | 2,404 (no deletion) |
| Duplicates marked | 0 | ~55 |
| Public search results | All records | Only unique, best records |
| "Closed before" indicator | Not shown | Shown when applicable |

---

## Technical Notes

### Duplicate Detection Criteria

Records are considered duplicates when they share the same normalized condo name (case-insensitive, whitespace-trimmed). The "best" record to keep is determined by:

1. **Has down payment info** - Records with `primary_down` value are preferred
2. **Lowest down payment** - Among those with values, lower is better
3. **Better review type** - Conventional Full > Conventional Limited > Non-QM Full > Non-QM Limited > Restricted
4. **Most recently updated** - Tie-breaker

### Public Website Filtering

The public API will now filter:
- `is_duplicate = false` (only show unique/best records)
- `review_type != 'Restricted'` (don't show non-financeable buildings)
- `deleted_at IS NULL` (respect soft deletes)

This ensures customers only see buildings they can actually finance, with the best available terms.

