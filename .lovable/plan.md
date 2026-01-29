# Plan: Enhanced Approved Lenders Page

**Status: ✅ COMPLETED**

This plan addressed three main requests:
1. ✅ Add a new "Additional Info" section in the lender detail popup for restrictions, special features, and searchable notes
2. ✅ Add an AI-powered search button for natural language lender filtering
3. ✅ Fix the column visibility modal to only show lender-specific columns (not lead/borrower columns)

---

## Implementation Summary

### Part 1: Additional Info Section in Lender Detail Dialog ✅
- Added `special_features` and `restrictions` columns to the `lenders` table (text[] arrays)
- Added new "Additional Info" section between Maximum LTVs and Notes
- Special Features display as green badges with delete buttons
- Restrictions display as orange badges with delete buttons
- Add buttons allow adding new items via prompt

### Part 2: AI-Powered Lender Search ✅
- Created `supabase/functions/ai-lender-search/index.ts` using Lovable AI (google/gemini-3-flash-preview)
- Created `src/components/modals/AILenderSearchModal.tsx` with:
  - Natural language search input
  - Example queries for guidance
  - Results list with lender type badges
  - View button to open lender detail
  - Select all/email selected functionality
- Added "AI Search" button with Sparkles icon next to Import CSV

### Part 3: Column Visibility Fix ✅
- Added `skipDatabaseFields` prop to `ColumnVisibilityModal` and `ColumnVisibilityButton`
- Created `LENDER_SECTIONS` mapping for lender-specific column groupings:
  - BASIC INFO, CONTACT INFO, LOAN LIMITS, PRODUCTS, LTV LIMITS, NUMBERS, OTHER
- Updated `ApprovedLenders.tsx` to pass `skipDatabaseFields={true}`

---

## Files Changed

| File | Change |
|------|--------|
| Database | Added `special_features` and `restrictions` columns |
| `src/components/LenderDetailDialog.tsx` | Added "Additional Info" section with badge UI |
| `supabase/functions/ai-lender-search/index.ts` | New edge function for AI-powered search |
| `src/components/modals/AILenderSearchModal.tsx` | New modal for AI search UI |
| `src/pages/contacts/ApprovedLenders.tsx` | Added AI Search button, AILenderSearchModal, skipDatabaseFields |
| `src/components/ui/column-visibility-modal.tsx` | Added skipDatabaseFields prop and LENDER_SECTIONS |
| `src/components/ui/column-visibility-button.tsx` | Pass through skipDatabaseFields prop |
| `supabase/config.toml` | Registered ai-lender-search function |
