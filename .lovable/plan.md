

# Plan: Enhanced Approved Lenders Page

This plan addresses three main requests:
1. Add a new "Additional Info" section in the lender detail popup for restrictions, special features, and searchable notes
2. Add an AI-powered search button for natural language lender filtering
3. Fix the column visibility modal to only show lender-specific columns (not lead/borrower columns)

---

## Part 1: Add "Additional Info" Section in Lender Detail Dialog

### Location
Between the "Maximum LTVs" section (line ~947) and the "Notes" section (line ~951) in `LenderDetailDialog.tsx`

### Database Change
Add new columns to the `lenders` table:
- `special_features` (text[] - array of strings)
- `restrictions` (text[] - array of strings)

### UI Design
A new collapsible section with:
- Header: "Additional Info" with `Info` icon and `+` button
- Two sub-sections:
  1. **Special Features** - Green-tinted badges showing features like "21 Day Lock", "No MI", etc.
  2. **Restrictions** - Orange-tinted badges showing restrictions like "Distribution to general public not allowed"
- Each item has an inline delete button (X)
- Add new items via text input that appears when clicking "+"

### Code Changes

**File: `src/components/LenderDetailDialog.tsx`**
1. Import `Info` and `Tag` icons from lucide-react
2. Add state for adding new features/restrictions
3. Add the new section between LTVs and Notes (~line 947):

```text
+-----------------------------------------+
|  ⓘ Additional Info                    + |
+-----------------------------------------+
|  Special Features:                      |
|  [21 Day Lock ×] [30 Day Lock ×]       |
|  [+ Add feature...]                     |
|                                         |
|  Restrictions:                          |
|  [No public distribution ×]             |
|  [+ Add restriction...]                 |
+-----------------------------------------+
```

**File: `src/integrations/supabase/types.ts`**
Will be auto-updated after migration

---

## Part 2: Add AI-Powered Lender Search

### Location
Next to the Import CSV button in the header toolbar of `ApprovedLenders.tsx`

### New Edge Function
Create `supabase/functions/ai-lender-search/index.ts`

**Functionality:**
1. Accepts a natural language query (e.g., "lenders that work on non-warrantable condos")
2. Uses Lovable AI (google/gemini-3-flash-preview) to understand intent
3. Converts to structured filters (e.g., `product_nwc = 'Y'`)
4. Queries the lenders table and returns matching results
5. Also searches `special_features`, `restrictions`, and `notes` fields for text matches

### UI Components

**New File: `src/components/modals/AILenderSearchModal.tsx`**
- Modal dialog with a text input for natural language queries
- Shows loading spinner while processing
- Displays results in a list with lender names, matching fields, and action buttons:
  - "View" - opens the lender detail dialog
  - "Select" - adds to current selection for bulk email
- Option to "Apply as Filter" - converts AI results to a filter condition

**Toolbar Button:**
Add next to the Import CSV button:
```tsx
<Button variant="outline" size="sm" onClick={() => setIsAISearchOpen(true)}>
  <Sparkles className="h-4 w-4 mr-2" />
  AI Search
</Button>
```

### API Design

**Request:**
```json
{
  "query": "lenders that can do non-warrantable condos with 80% LTV"
}
```

**Response:**
```json
{
  "lender_ids": ["uuid1", "uuid2"],
  "matching_criteria": "product_nwc = 'Y' AND max_ltv >= 80",
  "explanation": "Found 3 lenders offering Non-Warrantable Condo products with at least 80% LTV"
}
```

---

## Part 3: Fix Column Visibility Modal for Lenders Page

### Problem
The `ColumnVisibilityModal` uses `useFields()` which pulls from `crm_fields` table containing lead/borrower fields. The Approved Lenders page needs only lender-specific columns.

### Solution
Create a separate version of the column visibility modal that doesn't use `useFields()` and instead uses the local `initialColumns` array already defined in `ApprovedLenders.tsx`.

### Option A: Prop-based Override (Recommended)
Modify `ColumnVisibilityModal` to accept an optional `skipDatabaseFields` prop:

```tsx
interface ColumnVisibilityModalProps {
  // ... existing props
  skipDatabaseFields?: boolean;  // When true, don't merge with allFields from useFields()
}
```

When `skipDatabaseFields={true}`:
- Only show the columns passed in the `columns` prop
- Don't merge with `crm_fields` from the database
- Group columns by lender-specific categories instead

### Code Changes

**File: `src/components/ui/column-visibility-modal.tsx`**
1. Add `skipDatabaseFields` prop
2. Conditionally skip the `allFields` merge when true
3. Create lender-specific section groupings:

```typescript
const lenderSections = [
  'BASIC INFO',      // #, Lender Name, Type, Status
  'CONTACT INFO',    // AE, Email, Phone, Portal
  'LOAN LIMITS',     // Min Loan, Max Loan, Initial Approval, Renewed On, EPO
  'PRODUCTS',        // All product_* columns
  'LTV LIMITS',      // All *_max_ltv columns
  'NUMBERS',         // Min FICO, Min Sqft, etc.
  'OTHER',           // Notes
];
```

**File: `src/components/ui/column-visibility-button.tsx`**
1. Add `skipDatabaseFields` prop and pass through

**File: `src/pages/contacts/ApprovedLenders.tsx`**
1. Pass `skipDatabaseFields={true}` to `ColumnVisibilityButton`
2. Update `initialColumns` to include `section` property for each column

---

## Summary of Changes

| File | Change Type |
|------|-------------|
| Database migration | Add `special_features` and `restrictions` columns |
| `src/components/LenderDetailDialog.tsx` | Add "Additional Info" section |
| `supabase/functions/ai-lender-search/index.ts` | New edge function for AI search |
| `src/components/modals/AILenderSearchModal.tsx` | New modal component |
| `src/pages/contacts/ApprovedLenders.tsx` | Add AI Search button, fix column visibility |
| `src/components/ui/column-visibility-modal.tsx` | Add `skipDatabaseFields` prop |
| `src/components/ui/column-visibility-button.tsx` | Pass through new prop |
| `supabase/config.toml` | Register new edge function |

---

## Technical Notes

### AI Search Implementation
- Uses Lovable AI Gateway (google/gemini-3-flash-preview)
- Tool calling to extract structured filter criteria
- Falls back to full-text search on notes/special_features/restrictions if no structured match
- Results are clickable to view lender details or add to selection

### Database Schema Changes
```sql
ALTER TABLE lenders 
ADD COLUMN special_features text[] DEFAULT '{}',
ADD COLUMN restrictions text[] DEFAULT '{}';
```

### Searchability
The new `special_features` and `restrictions` columns will be:
1. Searchable via the global search bar (text matching)
2. Searchable via AI natural language queries
3. Displayed in the lender detail popup as editable badge lists

