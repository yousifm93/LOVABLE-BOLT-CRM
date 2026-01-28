

# Plan: Reset Email Categories & Make Section Collapsible

## Overview

This plan addresses two requests:
1. **Zero out all email categories** - Delete all records from the `email_categories` database table so counts reset to 0
2. **Make CATEGORIES section collapsible** - Add a toggle chevron to expand/collapse the categories list in the sidebar

---

## Part 1: Database Cleanup

### Action: Delete all email category records

Currently there are **25 records** in the `email_categories` table (all assigned to the 'yousif' account from December 2025 - January 2026).

**SQL to execute:**
```sql
DELETE FROM email_categories;
```

This will:
- Remove all 25 category assignments
- Reset all category counts to 0 (Needs Attention, File, Lender Mktg, Reviewed - N/A, Email template)
- Keep the `custom_email_categories` table intact (the category definitions themselves)
- Allow fresh drag-and-drop categorization going forward

---

## Part 2: Make Categories Section Collapsible

### Current State
The CATEGORIES section in the sidebar (lines 1394-1470) is always expanded with no way to collapse it.

### Changes to `src/pages/Email.tsx`

#### 1. Add state for collapse toggle

```typescript
const [categoriesExpanded, setCategoriesExpanded] = useState(true);
```

#### 2. Update the CATEGORIES header (around line 1396-1407)

Replace the static header with an interactive toggle:

```typescript
<div className="flex items-center justify-between pl-2 pr-3 mb-2 pt-4">
  <button
    onClick={() => setCategoriesExpanded(!categoriesExpanded)}
    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
  >
    {categoriesExpanded ? (
      <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronRight className="h-3 w-3" />
    )}
    CATEGORIES
  </button>
  <Button
    variant="ghost"
    size="icon"
    className="h-5 w-5"
    onClick={() => setIsAddingCategory(true)}
    title="Add category"
  >
    <Plus className="h-3 w-3" />
  </Button>
</div>
```

#### 3. Wrap category items in collapsible container (lines 1409-1470)

```typescript
{categoriesExpanded && (
  <>
    {/* Add category input */}
    {isAddingCategory && (
      // ... existing add category input
    )}
    
    {customCategories.map(category => {
      // ... existing category buttons
    })}
  </>
)}
```

#### 4. Add ChevronDown and ChevronRight to imports

Add to the existing lucide-react import (line 3):
```typescript
import { ..., ChevronDown, ChevronRight } from "lucide-react";
```

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `email_categories` table | Delete all 25 records (data cleanup) |
| `src/pages/Email.tsx` | Add `categoriesExpanded` state |
| `src/pages/Email.tsx` | Add chevron toggle to CATEGORIES header |
| `src/pages/Email.tsx` | Wrap category list in conditional render |
| `src/pages/Email.tsx` | Import ChevronDown and ChevronRight icons |

---

## Expected Result

- All category counts will show **0** immediately after cleanup
- The CATEGORIES section will have a clickable chevron to expand/collapse
- Dragging emails to categories will work correctly going forward with proper account isolation
- Fresh start with no legacy UID mismatches

