

# Plan: Title Case Lender Names in List View + Dynamic Field Discovery

## Overview
Two main requests:
1. **Display lender names in Title Case** in the Lender Directory list (currently showing ALL CAPS)
2. **Enable AI to discover and suggest NEW field categories** from marketing emails (beyond the ~40 existing product/number columns)

---

## Part 1: Title Case Lender Names in List View

### Current State
- Lender names are stored in the database as-is (often ALL CAPS from imports)
- The `toLenderTitleCase()` utility exists in `src/lib/utils.ts` and is used for email sending
- The Approved Lenders page (`src/pages/contacts/ApprovedLenders.tsx`) displays `lender_name` directly without formatting

### Change
**File: `src/pages/contacts/ApprovedLenders.tsx`**

Update the lender name column cell renderer (lines 225-235) to apply the title case formatting:

```tsx
// Current
<span className="font-medium">{row.original.lender_name}</span>

// Updated
import { toLenderTitleCase } from "@/lib/utils";
// ...
<span className="font-medium">{toLenderTitleCase(row.original.lender_name)}</span>
```

This uses the existing utility that:
- Preserves known acronyms: EPM, PRMG, UWM, FEMBI, BAC, A&D
- Keeps 2-letter words uppercase (BB, TD, etc.)
- Converts everything else to Title Case ("ANGEL OAK" → "Angel Oak")

---

## Part 2: Dynamic Field Discovery from Lender Marketing Emails

### Current State
- The edge function `parse-lender-marketing-data/index.ts` has a fixed set of ~25 product/number fields it looks for
- The AI is instructed to extract only predefined fields (max_ltv, min_fico, product_dscr, etc.)
- When it finds something new (like "mortgage lates" or "max acres"), it has nowhere to put it
- The `lenders` table has a `custom_fields` JSONB column already available for dynamic data

### Solution: Expand AI extraction to discover NEW categories

#### A) Update AI System Prompt
Add instructions for the AI to identify and extract "special features" as discoverable categories:

**New prompt additions:**
```
DISCOVERING NEW PRODUCT/FEATURE CATEGORIES:
Beyond standard products, look for distinctive offerings that could become new tracking categories:
- Late payment policies (e.g., "Unlimited 30 day lates accepted" → category: "mortgage_lates_accepted", value: "Yes")
- Credit event seasoning (e.g., "2-year credit event seasoning" → category: "credit_event_seasoning", value: "2 years")
- FICO policies (e.g., "Primary wage earner FICO used" → category: "primary_wage_earner_fico_only", value: "Yes")
- Property constraints (e.g., "Up to 20 acres" → category: "max_acres", value: "20")
- Trade line requirements (e.g., "No trade lines required" → category: "no_tradelines_required", value: "Yes")
- Borrower-specific LTVs (e.g., "I-10 borrowers 85% LTV" → category: "itin_max_ltv", value: "85%")
- Special products (e.g., "HE Loan offered" → category: "product_he_loan", value: "Y")

Format discovered features as:
{ category_key: "snake_case_name", display_name: "Human Readable Name", value: "extracted value", value_type: "boolean|number|text" }
```

#### B) Add Tool Parameter for Discovered Features
Update the AI tool schema to include a `discovered_features` array:

```typescript
discovered_features: {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      category_key: { type: 'string', description: 'Snake case identifier (e.g., mortgage_lates_accepted)' },
      display_name: { type: 'string', description: 'Human-readable name (e.g., Mortgage Lates Accepted)' },
      value: { type: 'string', description: 'The extracted value' },
      value_type: { type: 'string', enum: ['boolean', 'number', 'text'] }
    }
  }
}
```

#### C) Store Discovered Features as Suggestions
When the AI extracts `discovered_features`, create `lender_field_suggestions` entries with:
- `field_name`: The `category_key` from AI (e.g., "mortgage_lates_accepted")
- `suggested_value`: The value (e.g., "Yes" or "20")
- `is_custom_field`: true (new flag to distinguish from standard fields)

#### D) Handle Approval of Custom Fields
Update the approval logic in `useLenderMarketingSuggestions.tsx` to:
1. Check if `field_name` matches a known database column
2. If not, write to `custom_fields` JSONB (already implemented as fallback)
3. The existing JSONB fallback handles this, but we'll improve it to preserve the `display_name`

---

## Technical Changes Summary

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/contacts/ApprovedLenders.tsx` | Add `toLenderTitleCase` formatting to lender name column |
| `supabase/functions/parse-lender-marketing-data/index.ts` | Expand AI prompt + add `discovered_features` to tool schema + create suggestions for new categories |
| `src/hooks/useLenderMarketingSuggestions.tsx` | (Already handles custom_fields fallback) - optionally improve display of custom field suggestions |

---

## Example: How the LeadPlus Email Would Be Parsed

From the email content you shared:
- "Unlimited 30 day late accepted" → `{ category_key: "mortgage_lates_30day", display_name: "30-Day Mortgage Lates", value: "Unlimited", value_type: "text" }`
- "Credit Events 2yr seasoning" → `{ category_key: "credit_event_seasoning_years", display_name: "Credit Event Seasoning", value: "2", value_type: "number" }`
- "Primary wage earner FICO used" → `{ category_key: "primary_wage_earner_fico_only", display_name: "Primary Wage Earner FICO Only", value: "Y", value_type: "boolean" }`
- "Up to 20 acre properties" → `{ category_key: "max_acres", display_name: "Max Property Acres", value: "20", value_type: "number" }`
- "No trade lines required" → `{ category_key: "no_tradelines_required", display_name: "No Trade Lines Required", value: "Y", value_type: "boolean" }`
- "I-10 borrowers 85% LTV" → `{ category_key: "itin_max_ltv", display_name: "ITIN Max LTV", value: "85%", value_type: "text" }`
- "HE Loan" → `{ category_key: "product_he_loan", display_name: "HE Loan Product", value: "Y", value_type: "boolean" }`

These would appear in the Lender Marketing Updates modal as suggestions. When approved, they'd be stored in the lender's `custom_fields` JSONB column.

---

## Benefits

1. **Title Case Display**: Lender names look professional ("Angel Oak" instead of "ANGEL OAK")
2. **Schema Flexibility**: New product types and features get captured without database migrations
3. **AI-Driven Discovery**: The system learns about new lender offerings automatically
4. **Human Review**: All discoveries require approval before saving (existing workflow)
5. **Extensible**: Custom fields can later be promoted to real columns if they become common

