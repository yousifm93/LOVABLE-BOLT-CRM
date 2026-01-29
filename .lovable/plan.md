

# Plan: Backfill Missing Condo Addresses & Connect to mortgagebolt.org

## Summary

This plan addresses two requests:
1. **Fill in missing street addresses** for condos using the uploaded spreadsheet (mci_addy.xlsx)
2. **Ensure mortgagebolt.org/condo/approved connects** to the internal condo list database

---

## Data Analysis

### Spreadsheet Contents
The uploaded spreadsheet contains **377 condos** with complete address information:
- Development Name, Neighborhood, Address, City, State, Zip
- Covers Miami-Dade County areas: Brickell, Downtown Miami, Edgewater, South Beach, Coconut Grove, Coral Gables, Key Biscayne, Bal Harbour, Surfside, Sunny Isles Beach, Aventura

### Database Status
- **1,444 condos** are missing street addresses in the database
- **~120-150 condos** from the spreadsheet can fill missing addresses (based on zip code and name matching analysis)

### Examples of Matches Found
| Condo Name (Database) | Suggested Address (from Spreadsheet) |
|----------------------|--------------------------------------|
| Brickell Flatiron | 1000 Brickell Plaza |
| Club At Brickell Bay Plaza | 1200 Brickell Bay Dr |
| Isola | 770 Claughton Island Dr |
| Brickell On The River N Tower | 31 SE 5 St |
| Brickell Key II | 540 Brickell Key Dr |
| The Mark On Brickell Condo | 1155 Brickell Bay Dr |
| Brickellhouse | 1300 Brickell Bay Dr |
| Nine At Mary Brickell | 999 SW 1 Ave |

---

## Solution

### Part 1: Create Edge Function to Backfill Addresses

**New File:** `supabase/functions/backfill-condo-addresses/index.ts`

This edge function will:
1. Parse the spreadsheet data (embedded as a JSON mapping)
2. For each condo missing an address, attempt to match by:
   - **Exact name match** (case-insensitive)
   - **Fuzzy name match** (removing common suffixes like "Condo", "Tower", "Residences")
   - **Zip code + partial name match** for disambiguation
3. Update matched condos with the street address from the spreadsheet
4. Return a summary of matches made

**Matching Logic:**
```text
For each spreadsheet entry:
  1. Normalize name: LOWER(TRIM(name))
  2. Remove suffixes: "Condo", "Residences", "Tower", etc.
  3. Find condos where:
     - Name matches (fuzzy) AND
     - Zip matches AND
     - street_address IS NULL
  4. Update street_address with spreadsheet value
```

### Part 2: Run Database Migration for Address Updates

Create a SQL migration that updates addresses based on the spreadsheet mapping. The migration will use a comprehensive CASE statement mapping condo names (with fuzzy matching) to addresses.

**Sample update pattern:**
```sql
UPDATE condos
SET street_address = CASE
  WHEN LOWER(condo_name) LIKE '%brickell flatiron%' AND zip = '33131' 
    THEN '1000 Brickell Plaza'
  WHEN LOWER(condo_name) LIKE '%club at brickell bay%' AND zip = '33131' 
    THEN '1200 Brickell Bay Dr'
  -- ... more mappings from spreadsheet
END
WHERE (street_address IS NULL OR street_address = '')
  AND deleted_at IS NULL;
```

### Part 3: Deploy Public Condo Search Edge Function

The `public-condo-search` edge function already exists and is properly configured (verify_jwt = false for public access). It needs to be deployed so mortgagebolt.org can connect to it.

**Current Function Capabilities:**
- Searches by condo name, street address, or city
- Returns: name, address, down payments (primary/second/investment), approvals (UWM/A&D)
- Limited to 50 results for performance
- CORS enabled for cross-origin requests from mortgagebolt.org

**Action:** Deploy the `public-condo-search` edge function to make it available at:
```
https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/public-condo-search?q=searchterm
```

### Part 4: Add past_mb_closing to Public API Response (Enhancement)

Update `public-condo-search` to include the new `past_mb_closing` field so the public site can show which buildings MortgageBolt has closed at before.

**File:** `supabase/functions/public-condo-search/index.ts`

Add to select query:
```typescript
.select('condo_name, street_address, city, state, zip, primary_down, second_down, investment_down, source_uwm, source_ad, past_mb_closing')
```

Add to response:
```typescript
pastMbClosing: condo.past_mb_closing || false
```

---

## Implementation Order

1. **Create address mapping migration** - SQL migration with all 377 spreadsheet addresses mapped to database condo names
2. **Execute migration** - Update ~120-150 condos with missing addresses
3. **Update public-condo-search edge function** - Add past_mb_closing to API response
4. **Deploy edge function** - Make public API available for mortgagebolt.org
5. **Provide connection details** - Give URL/code snippet for mortgagebolt.org integration

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/[timestamp]_backfill_condo_addresses.sql` | Create - SQL migration with address mappings |
| `supabase/functions/public-condo-search/index.ts` | Modify - Add past_mb_closing to response |
| `supabase/functions/backfill-condo-addresses/index.ts` | Create - Optional edge function for future manual backfills |

---

## Expected Results

After implementation:
- **~120-150 condos** will have their missing street addresses filled in
- **mortgagebolt.org/condo/approved** search will query the live condo database
- **Past MB Closing** indicator will be available in public API for enhanced marketing
- All future address updates in the CRM will automatically reflect on the public site

---

## mortgagebolt.org Integration

The public website search box should call:
```javascript
const response = await fetch(
  `https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/public-condo-search?q=${searchTerm}&limit=20`
);
const data = await response.json();
// data.results contains array of matching condos
```

This is already the expected integration pattern based on the existing edge function design.

