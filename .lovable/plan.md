
# Smart Date Formatting - Hide Year for Current Year

## Overview
Update the date formatters to omit the year when dates are in the current year (2026), while still showing the year for dates in other years (e.g., 2025).

---

## Current Behavior
- `formatDate()` always shows: "Feb 3, 2026"
- `formatDateShort()` never shows year: "Feb 3"

## New Behavior
- `formatDate()` will show:
  - **"Feb 3"** for dates in the current year (2026)
  - **"Feb 3, 2025"** for dates in other years
- `formatDateShort()` unchanged (already doesn't show year)

---

## File Modified
**src/utils/formatters.ts**

---

## Implementation

Update the `formatDate` function (lines 56-81) to check if the date's year matches the current year:

```typescript
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    let date: Date;
    
    // If it's a date-only string (YYYY-MM-DD), parse it as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      const normalized = normalizeTimestamp(dateString);
      date = new Date(normalized);
    }
    
    if (isNaN(date.getTime())) return "—";
    
    const currentYear = new Date().getFullYear();
    const dateYear = date.getFullYear();
    
    // Only show year if it's different from current year
    if (dateYear === currentYear) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return "—";
  }
};
```

---

## Affected Areas

This single change will automatically update dates throughout the CRM wherever `formatDate` is used:
- Active Pipeline (Close Date, Lock Expiration)
- Lead details
- Task due dates
- Conditions tabs
- Any other date columns

---

## Examples

| Date Value | Current Display | New Display |
|------------|-----------------|-------------|
| 2026-02-03 | Feb 3, 2026 | Feb 3 |
| 2026-02-19 | Feb 19, 2026 | Feb 19 |
| 2025-12-15 | Dec 15, 2025 | Dec 15, 2025 |
| 2027-01-10 | Jan 10, 2027 | Jan 10, 2027 |

---

## Technical Notes
- Uses `new Date().getFullYear()` to dynamically get current year
- Automatically adapts as years change (when 2027 arrives, 2027 dates will hide year)
- No database changes required
- Backward compatible with existing code
