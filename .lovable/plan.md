
# Plan: Add Month Selector Buttons to Dashboard

## Summary

Add a row of month selector buttons (January through December) above the main dashboard tabs (Sales, Calls, Active, etc.). Clicking a month button will filter all dashboard data to show data from that selected month. The current month (February) will be highlighted by default.

---

## Current Architecture

### Data Flow
1. `DashboardTabs.tsx` - Main dashboard component with Sales, Calls, Active, Closed, Miscellaneous, All tabs
2. `useDashboardData.tsx` - Custom hook that fetches all dashboard metrics using React Query
3. All date ranges are calculated from `new Date()` (today) with no month selection capability

### Current Date Calculations
The hook calculates dates like this:
```typescript
const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
```

---

## Implementation Approach

### 1. Add Month State to DashboardTabs.tsx

Add state to track the selected month:
```typescript
const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed
});
```

### 2. Create Month Selector Buttons Component

Add a row of buttons above the tabs:
```typescript
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const currentMonth = new Date().getMonth();

<div className="flex gap-1 mb-4">
  {months.map((month, index) => (
    <Button
      key={month}
      variant={selectedMonth.month === index ? "default" : "outline"}
      size="sm"
      onClick={() => setSelectedMonth({ year: selectedMonth.year, month: index })}
      className={cn(
        "px-3 py-1.5 text-xs font-medium",
        selectedMonth.month === index && "bg-primary text-primary-foreground",
        index === currentMonth && selectedMonth.month !== index && "border-primary"
      )}
    >
      {month}
    </Button>
  ))}
</div>
```

### 3. Update useDashboardData Hook

Modify the hook to accept an optional month parameter:
```typescript
interface DashboardDataOptions {
  year?: number;
  month?: number; // 0-indexed (0 = January, 11 = December)
}

export const useDashboardData = (options?: DashboardDataOptions) => {
  // Use provided month/year or default to current
  const baseDate = useMemo(() => {
    if (options?.year !== undefined && options?.month !== undefined) {
      return new Date(options.year, options.month, 15); // Mid-month to avoid edge cases
    }
    return new Date();
  }, [options?.year, options?.month]);
  
  const today = baseDate;
  // ... rest of calculations based on baseDate
};
```

### 4. Update All Date Calculations

All queries will need to use the selected month instead of `new Date()`:

**Before:**
```typescript
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
```

**After:**
```typescript
const selectedYear = options?.year ?? today.getFullYear();
const selectedMonthNum = options?.month ?? today.getMonth();
const startOfMonth = new Date(selectedYear, selectedMonthNum, 1);
const startOfNextMonth = new Date(selectedYear, selectedMonthNum + 1, 1);
```

### 5. Handle "Today", "Yesterday", "This Week" Labels

When viewing historical months, labels like "Today" and "Yesterday" don't make sense. We'll adjust the display:
- For current month: Show "Today", "Yesterday", "This Week", "This Month"
- For past months: Show the full month data and disable/hide daily breakdowns

**Option A (Simpler):** Keep all cards but show 0 for Today/Yesterday when viewing past months
**Option B (Better UX):** Conditionally hide Today/Yesterday cards when not viewing current month

I recommend **Option A** for now to avoid major UI changes - the cards will simply show 0 counts for historical months.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DashboardTabs.tsx` | Add month state, month selector buttons, pass month to hook |
| `src/hooks/useDashboardData.tsx` | Accept month parameter, update all date calculations |

---

## Visual Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                               │
│  Comprehensive mortgage business analytics                               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Search...                                                           ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  │ Jan │ Feb │ Mar │ Apr │ May │ Jun │ Jul │ Aug │ Sep │ Oct │ Nov │ Dec │  ← NEW
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
│        ▲                                                                 │
│        └── Currently highlighted (active month)                          │
│                                                                          │
│  ┌───────┬───────┬────────┬────────┬───────────────┬─────┐              │
│  │ Sales │ Calls │ Active │ Closed │ Miscellaneous │ All │              │
│  └───────┴───────┴────────┴────────┴───────────────┴─────┘              │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │   Leads     │ │Applications │ │ Face-to-Face│ │Broker Opens │        │
│  │   8         │ │   5         │ │   0         │ │   0         │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Behavior by Month Selection

| View | Current Month (Feb 2026) | Past Month (Jan 2026) |
|------|--------------------------|----------------------|
| This Month | Feb 1-28 data | Jan 1-31 data |
| This Week | Current week | Last week of Jan |
| Yesterday | Feb 1 | Jan 30 |
| Today | Feb 2 | Jan 31 |
| All | All non-closed leads | All non-closed leads |

**Note:** When viewing past months, "Today/Yesterday" will reference the last days of that month, which is technically correct but may be confusing. Alternative: We could hide those cards for historical views.

---

## Technical Considerations

1. **React Query Cache Keys**: All queries include date params in their keys, so changing months will trigger new fetches
2. **Performance**: Each month change will refetch data - this is acceptable since React Query handles caching
3. **Year Navigation**: Currently this is scoped to the current year (2026). We may want to add year selection later if needed
4. **Query Invalidation**: No changes needed - existing cache strategy remains effective

---

## Implementation Steps

1. Update `useDashboardData.tsx` to accept `{ year, month }` options parameter
2. Update all date calculations to use the provided month instead of `new Date()`
3. Add `selectedMonth` state to `DashboardTabs.tsx`
4. Create month selector button row component
5. Pass `selectedMonth` to `useDashboardData` hook
6. Ensure all modals and detail views respect the selected month context
