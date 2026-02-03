
# Plan: Import PRMG Condo List

## Overview

Adding **81 condos** from PRMG (a lender like UWM and A&D) to your existing condo directory. I'll add a new PRMG column, import the data, and avoid duplicates by matching on condo name and address.

---

## Data Summary from the Excel File

| Metric | Count |
|--------|-------|
| **Total condos in file** | 81 |
| **Review Types** | Full Review (Conventional Full), Limited Review (Conventional Limited) |
| **Expiration dates** | All between 2025-2027 |
| **State** | All Florida (FL) |

**Sample entries from your file:**
- Sailboat Pointe, 2440 Northwest 33rd St, Oakland Park, FL 33009 - Full Review, expires 07/03/2026
- Villas of Bonaventure in Tract 37 South, 342 Fairway Circle, Weston, FL 33326 - Limited Review, expires 04/23/2026
- Ocean Walk at New Smyrna Beach Building No. 18, 5300 S Atlantic Ave, New Smyrna Beach, FL 32169 - Full Review, expires 04/14/2026

---

## What I'll Build

### 1. Database Changes
Add a new `source_prmg` boolean column to the `condos` table:
```sql
ALTER TABLE condos ADD COLUMN source_prmg boolean DEFAULT false;
```

### 2. UI Updates

**Condolist.tsx:**
- Add "PRMG" column with green checkmark (matching UWM style)
- Add "PRMG Approved" filter option

**CondoDetailDialog.tsx:**
- Add PRMG toggle in the "Approval Sources" card alongside UWM and A&D

**CreateCondoModal.tsx:**
- Add PRMG checkbox when creating new condos

**public-condo-search edge function:**
- Include `source_prmg` in public search results

### 3. Import Logic

I'll create an import edge function that:
1. **Normalizes and matches** condos by:
   - Condo name (case-insensitive, trimmed)
   - Street address (normalized: removes extra spaces, standardizes abbreviations)
   - City + Zip combination

2. **For existing matches:**
   - Sets `source_prmg = true`
   - Updates expiration date if provided
   - Does NOT overwrite other fields

3. **For new condos:**
   - Inserts with PRMG data
   - Sets `source_prmg = true`
   - Review type: "Full Review" → "Conventional Full", "Limited Review" → "Conventional Limited"

---

## Expected Results

After import:
- **Estimated new condos**: ~50-70 (depends on how many match existing UWM/A&D records)
- **Estimated updates**: ~10-30 existing condos will get `source_prmg = true`
- You'll see a PRMG column in the condo list with green checkmarks
- The import report will show exact counts of inserted vs. updated records

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[new].sql` | Create | Add `source_prmg` column |
| `supabase/functions/import-prmg-condos/index.ts` | Create | New edge function for PRMG import with duplicate detection |
| `src/pages/resources/Condolist.tsx` | Modify | Add PRMG column, PRMG filter |
| `src/components/CondoDetailDialog.tsx` | Modify | Add PRMG toggle in sources section |
| `src/components/modals/CreateCondoModal.tsx` | Modify | Add PRMG checkbox |
| `supabase/functions/public-condo-search/index.ts` | Modify | Include `source_prmg` in results |
| `src/integrations/supabase/types.ts` | Auto-update | TypeScript types for new column |

---

## Implementation Steps

1. **Database migration**: Add `source_prmg` column
2. **Create import function**: Parse the Excel data and handle duplicates
3. **Run import**: Execute with the 81 PRMG condos
4. **Update UI**: Add PRMG column and filter to Condolist
5. **Update dialogs**: Add PRMG toggle to detail and create modals
6. **Report results**: Show how many were inserted vs. updated

---

## Duplicate Detection Strategy

The import will use this priority for matching:
1. **Exact condo name match** (case-insensitive) → Update existing
2. **Exact street address + city + zip match** → Update existing
3. **Fuzzy name match** (e.g., "Sailboat Pointe" vs "Sailboat Pointe Condo") → Flag for review
4. **No match** → Insert as new

This ensures we don't create duplicates while still capturing new condos from PRMG.
