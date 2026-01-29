
# Plan: Move Duplicate Column & Fix Text Truncation

## Summary

Two UI improvements to the Condo List page:
1. Move the "Duplicate?" column from the beginning to between "Last Updated" and "Actions"
2. Fix text truncation so city names and addresses show ellipsis when truncated and expand when columns are resized

---

## Current Issue

**Screenshot shows:**
- City names like "Altamonte S..." cut off without ellipsis
- Street addresses like "and Regency Po..." cut off without ellipsis
- When column is resized, the text still doesn't show fully

**Root cause:** The Input components have fixed widths (`w-24` for city, `w-40` for street address) that override the column width. The text should flow to fill the column width and truncate with ellipsis when needed.

---

## Changes

### 1. Move Duplicate Column

In `createColumns` function, move the `is_duplicate` column from position 1 (first column) to position 18 (after `updated_at`/Last Updated).

**Current column order:**
1. is_duplicate (Status)
2. condo_name
3. street_address
4. city
5. ... other columns ...
17. cq_doc
18. updated_at (Last Updated)
19. [Actions - auto-generated]

**New column order:**
1. condo_name
2. street_address
3. city
4. ... other columns ...
17. cq_doc
18. updated_at (Last Updated)
19. is_duplicate (Duplicate?)
20. [Actions - auto-generated]

### 2. Rename Column Header

Change header from `"Status"` to `"Duplicate?"`

### 3. Fix Text Truncation in Input Fields

Update the Input components for `street_address`, `city`, `state`, and `zip` columns:

**Before:**
```tsx
<Input
  value={row.original.city || ""}
  onChange={(e) => handleUpdate(row.original.id, "city", e.target.value)}
  className="border-none bg-transparent p-1 h-8 w-24"  // Fixed width!
/>
```

**After:**
```tsx
<Input
  value={row.original.city || ""}
  onChange={(e) => handleUpdate(row.original.id, "city", e.target.value)}
  className="border-none bg-transparent p-1 h-8 w-full truncate"  // Full width + truncate
/>
```

This will:
- Allow the Input to fill the entire column width
- Show ellipsis when text is truncated
- Reveal full text when column is resized wider
- Keep the text truncated when column is narrow

---

## File Changes

**File:** `src/pages/resources/Condolist.tsx`

| Line | Change |
|------|--------|
| 73-84 | Move `is_duplicate` column definition to after `updated_at` column |
| 74 | Change header from `"Status"` to `"Duplicate?"` |
| 104 | Change `w-40` to `w-full truncate` for street_address Input |
| 116 | Change `w-24` to `w-full truncate` for city Input |
| 128 | Change `w-16` to `w-full truncate` for state Input |
| 140 | Change `w-20` to `w-full truncate` for zip Input |

---

## Expected Result

**After changes:**
- "Duplicate?" column appears between "Last Updated" and "Actions" columns
- City names show as "Altamonte S..." with proper ellipsis
- Street addresses show as "Grand Regency Po..." with proper ellipsis
- When user drags column wider, full text becomes visible: "Altamonte Springs", "Grand Regency Pointe"
- When column is narrow again, text truncates with ellipsis

---

## Technical Note

The DataTable component already handles column resizing via the `ResizeHandle` component. The issue is that the Input elements have fixed widths that don't respond to the column width. By using `w-full`, the Input will fill the cell and respect the column's dynamic width.
