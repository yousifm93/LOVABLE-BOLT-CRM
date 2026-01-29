

# Plan: Improve Past MB Closing Matching

## Current Status
- **44 condos** currently marked with past closings
- **825 past clients** in the system (623 with unique addresses)
- Many matches are being missed due to address formatting differences

## Root Cause Analysis

### 1. Address Format Mismatches (Primary Issue)
The current matching is too strict and fails on common abbreviations:

| Condo Address | Past Client Address | Should Match? |
|--------------|---------------------|---------------|
| 1200 Brickell Bay Dr | 1200 Brickell Bay Drive | Yes - but fails |
| 1000 Brickell Plaza | 1000 Brickell Plz | Yes - but fails |
| 100 Lincoln Rd | 100 Lincoln Road | Yes - but fails |
| 10275 Collins Ave | 10275 Collins Avenue | Yes - but fails |

With improved normalization, we can match **62 condos** instead of 44 (+18 more).

### 2. Many Past Closings Are Not Condos
Of 823 past clients, approximately **674 are at single-family homes or townhouses** that don't exist in the condo list. Only ~149 appear to be condo closings based on address patterns.

### 3. Missing Condo Addresses
1,413 condos have no street address, preventing any match even if a past client closed there.

---

## Solution Part 1: Improve Address Matching

Update the matching logic to normalize common abbreviations before comparing:

**Normalizations to apply:**
- Dr → Drive, Drive → Dr → normalized to "dr"
- Ave → Avenue → normalized to "ave"  
- St → Street → normalized to "st"
- Rd → Road → normalized to "rd"
- Blvd → Boulevard → normalized to "blvd"
- Ct → Court → normalized to "ct"
- Plz → Plaza → normalized to "plz"
- Remove periods, extra spaces, and case differences

**Database changes:**
1. Create a PostgreSQL function `normalize_address(text)` for consistent normalization
2. Update the trigger to use this function
3. Re-run the backfill with improved matching

**Expected result:** Match **62 condos** (up from 44)

---

## Solution Part 2: Find Missing Condo Addresses Online

For condos missing addresses, I can search online to find them. Priority condos (Miami-area high-rises):

| Condo Name | City | ZIP | Status |
|------------|------|-----|--------|
| Echo Condo | Aventura | 33180 | Can find |
| Aventi At Aventura | Aventura | 33180 | Can find |
| Turnberry Isle North/South | Aventura | 33180 | Can find |
| Mystic Pointe Tower 600 | Aventura | 33180 | Can find |
| Plus 163 Miami condos missing addresses | Miami | varies | Searchable |

**Approach:**
1. Search for well-known buildings using web search
2. Create a migration to update addresses for found buildings
3. This will enable more past_mb_closing matches

---

## Implementation Steps

### Step 1: Create Address Normalization Function
```sql
CREATE OR REPLACE FUNCTION normalize_address(addr text)
RETURNS text AS $$
BEGIN
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(addr, 
                ' (Drive|Dr)\.?$', ' dr', 'gi'),
              ' (Avenue|Ave)\.?$', ' ave', 'gi'),
            ' (Street|St)\.?$', ' st', 'gi'),
          ' (Road|Rd)\.?$', ' rd', 'gi'),
        ' (Boulevard|Blvd)\.?$', ' blvd', 'gi'),
      '[^a-zA-Z0-9 ]', '', 'g')
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Step 2: Update Trigger to Use Normalization
Modify the `update_condo_past_closing()` trigger to use the new function.

### Step 3: Re-run Backfill with Better Matching
```sql
UPDATE condos SET past_mb_closing = true
WHERE id IN (
  SELECT DISTINCT c.id
  FROM condos c
  INNER JOIN leads l ON normalize_address(c.street_address) = normalize_address(l.subject_address_1)
  WHERE l.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
    AND l.deleted_at IS NULL
    AND c.deleted_at IS NULL
);
```

### Step 4: Search Online for Missing Addresses
I'll search for addresses of well-known Miami/Aventura/Fort Lauderdale condos and add them via migration.

---

## Expected Results After Implementation

| Metric | Before | After |
|--------|--------|-------|
| Condos with past_mb_closing | 44 | ~62-70 |
| Condos with addresses | 991 | ~1,050+ |
| Matching accuracy | Low (strict) | High (normalized) |

---

## Files to Create/Modify

| File | Change |
|------|--------|
| Database migration | Create `normalize_address()` function |
| Database migration | Update trigger to use normalization |
| Database migration | Re-run backfill with improved matching |
| Database migration | Add discovered addresses for missing condos |

