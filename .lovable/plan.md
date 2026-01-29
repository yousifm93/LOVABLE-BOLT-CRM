
# Plan: Add "Past MB Closing" Column to Condo List

## Summary

Cross-reference all 823 past client addresses against the 2,404 condos in the directory and add a "Past MB Closing" column showing whether MortgageBolt has previously closed a loan at that condo property.

**Data Analysis Results:**
- **2,404 total condos** in the directory
- **825 past clients** (823 with addresses)
- **44 condos** currently match past client addresses (confirmed via address matching query)
- Example: "1300 S Miami Ave" → Dua Miami (SLS Brickell) has multiple past closings including Ryan Rached

---

## Solution Overview

### Approach: Computed Column via Database View or Lookup

The "Past MB Closing" indicator will be computed at query time by joining the condos table with normalized past client addresses. This ensures the data stays current as new closings are added.

---

## Technical Implementation

### Part 1: Add Database Column + Backfill

**Database Migration:**
```sql
-- Add the past_mb_closing boolean column
ALTER TABLE condos ADD COLUMN past_mb_closing boolean DEFAULT false;

-- Backfill by matching addresses
WITH matches AS (
  SELECT DISTINCT c.id as condo_id
  FROM condos c
  INNER JOIN leads l ON 
    LOWER(TRIM(REGEXP_REPLACE(c.street_address, '[^a-zA-Z0-9 ]', '', 'g'))) = 
    LOWER(TRIM(REGEXP_REPLACE(l.subject_address_1, '[^a-zA-Z0-9 ]', '', 'g')))
  WHERE l.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
    AND l.deleted_at IS NULL
    AND l.subject_address_1 IS NOT NULL
    AND c.deleted_at IS NULL
)
UPDATE condos SET past_mb_closing = true
WHERE id IN (SELECT condo_id FROM matches);
```

This normalizes addresses by:
- Converting to lowercase
- Removing special characters
- Trimming whitespace

### Part 2: Update Condo Interface

**File: `src/pages/resources/Condolist.tsx`**

Add to the `Condo` interface:
```typescript
interface Condo {
  // ... existing fields
  past_mb_closing: boolean | null;
}
```

### Part 3: Add New Column to DataTable

Insert the "Past MB Closing" column after the "A&D" column (before Review Type):

```typescript
{
  accessorKey: "past_mb_closing",
  header: "Past MB",
  cell: ({ row }) => (
    <div className="flex justify-center">
      {row.original.past_mb_closing ? (
        <CheckCircle className="h-4 w-4 text-blue-600" />
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  ),
  sortable: true,
},
```

### Part 4: Add Filter Option

Add a new filter in the filter toolbar:
```typescript
const [pastMbFilter, setPastMbFilter] = useState<string>("all");
```

Filter UI:
```tsx
<Select value={pastMbFilter} onValueChange={setPastMbFilter}>
  <SelectTrigger className="w-32">
    <SelectValue placeholder="Past MB" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="yes">Past MB ✓</SelectItem>
    <SelectItem value="no">No History</SelectItem>
  </SelectContent>
</Select>
```

---

## Column Placement

The new column will appear in this order:

| # | Condo Name | Street Address | City | State | Zip | UWM | A&D | **Past MB** | Review Type | ... |
|---|------------|----------------|------|-------|-----|-----|-----|-------------|-------------|-----|

---

## Future-Proofing: Database Trigger (Optional)

To automatically update `past_mb_closing` when new past clients are added:

```sql
CREATE OR REPLACE FUNCTION update_condo_past_closing()
RETURNS trigger AS $$
BEGIN
  -- When a lead moves to Past Clients stage with an address
  IF NEW.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
     AND NEW.subject_address_1 IS NOT NULL THEN
    UPDATE condos SET past_mb_closing = true
    WHERE LOWER(TRIM(REGEXP_REPLACE(street_address, '[^a-zA-Z0-9 ]', '', 'g'))) = 
          LOWER(TRIM(REGEXP_REPLACE(NEW.subject_address_1, '[^a-zA-Z0-9 ]', '', 'g')))
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_condo_past_closing
AFTER INSERT OR UPDATE OF pipeline_stage_id, subject_address_1 ON leads
FOR EACH ROW EXECUTE FUNCTION update_condo_past_closing();
```

---

## Summary of Changes

| File/Resource | Change |
|---------------|--------|
| Database migration | Add `past_mb_closing` column + backfill 44 matching condos |
| Database trigger | Auto-update when new past clients are added |
| `src/pages/resources/Condolist.tsx` | Add interface field, column definition, and filter |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

---

## Expected Results

After implementation:
- ✅ **44 condos** will show a blue checkmark in the "Past MB" column
- ✅ Users can filter to show only condos with previous closings
- ✅ New closings will automatically update the flag via database trigger
- ✅ Column is sortable (group all past closings at top/bottom)
