

# Equalize Top Row Card Heights: 2-Row Structural Layout

## Overview

Split the current single 3-column grid into a `flex flex-col gap-4` parent with two child grids: a top row for the three cards (equal height via `items-stretch`) and a bottom area for scrollable content.

## Changes

**File**: `src/components/ClientDetailDrawer.tsx`

### 1. Replace outer container (line 2052)

**Before:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 h-[calc(100vh-80px)] p-4 pt-0">
```

**After:**
```tsx
<div className="flex flex-col h-[calc(100vh-80px)] min-h-0 p-4 pt-0 gap-4">
  {/* Top Row - equal height cards */}
  <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] items-stretch gap-4">
```

Uses `gap-4` on the flex parent for consistent spacing between rows (no `mb-4`).

### 2. Extract the three top cards into the top row

Move these three components out of their respective scrollable columns and place them as direct children of the top-row grid:

- **Left**: `ContactInfoCard` (currently line 2063) -- wrap with `h-full flex flex-col` on the Card root
- **Center**: Pipeline/Status `Card` (currently line 2553) -- change `h-[360px]` to `h-full`, keep `flex flex-col`
- **Right**: `SendEmailTemplatesCard` (currently line 2659) -- ensure Card root has `h-full flex flex-col`

No `overflow-y-auto` on any top-row CardContent. Cards grow naturally to match the tallest sibling.

### 3. Close top row, open bottom area

```tsx
  </div>
  {/* Bottom Area - scrollable columns */}
  <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 flex-1 min-h-0">
```

### 4. Bottom columns retain existing behavior

- **Left column**: `overflow-y-auto`, contains About the Borrower, Latest File Update, etc. (ContactInfoCard removed)
- **Center column**: `overflow-y-auto flex flex-col`, contains LeadCenterTabs + activity buttons (Pipeline Card removed)
- **Right column**: `overflow-y-auto`, contains Quick Actions, Stage History, etc. (SendEmailTemplatesCard removed)

### 5. Center Card sizing fix (line 2553)

**Before:** `<Card className="h-[360px] flex flex-col">`
**After:** `<Card className="h-full flex flex-col">`

### 6. Mobile behavior

`grid-cols-1 lg:grid-cols-[1fr_2fr_1fr]` on both rows ensures equal-height behavior applies only on `lg+`. On mobile, cards stack naturally.

## Summary

| Detail | Value |
|--------|-------|
| Outer wrapper | `flex flex-col gap-4` (no `mb-4`) |
| Top row grid | `items-stretch gap-4`, 3 card siblings |
| Each top Card root | `h-full flex flex-col` |
| Top CardContent | No `overflow-y-auto` |
| Bottom grid | `flex-1 min-h-0`, columns keep `overflow-y-auto` |
| Responsive | Equal height on `lg+` only |
| File modified | `src/components/ClientDetailDrawer.tsx` |

