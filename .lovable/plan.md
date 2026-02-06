

# Fix Chat with Borrower Arrow, Lead Creation Date, and Lead Information Card Height

## 1. Chat with Borrower -- Move arrow to left side

Both instances of "Chat with Borrower" (Leads/PendingApp at line 2248 and Active/PastClient at line 2628) currently use a right-aligned ChevronDown icon. These will be updated to match the unified left-arrow collapsible pattern used by Quick Actions, DTI, and Third Party Items.

**File**: `src/components/ClientDetailDrawer.tsx`

**Lines 2248-2250** and **Lines 2628-2630**: Change from:
```tsx
<CardTitle className="text-sm font-bold flex items-center justify-between">
  Chat with Borrower
  <ChevronDown className="h-4 w-4 text-muted-foreground" />
</CardTitle>
```
To:
```tsx
<CardTitle className="text-sm font-semibold flex items-center gap-2">
  <ChevronDown className="h-4 w-4 text-muted-foreground" />
  Chat with Borrower
</CardTitle>
```

This puts the chevron on the left and uses `text-sm font-semibold` to match the other sections.

## 2. Fix Lead Creation Date relative time

**File**: `src/components/ClientDetailDrawer.tsx` (lines 964-991)

The current logic uses raw millisecond diff to calculate days, which doesn't account for calendar day boundaries properly. A lead created at 1:34 PM on Feb 5 would show "today" on Feb 6 morning because less than 24 hours have passed.

Fix by comparing calendar dates instead:
```tsx
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
const diffInDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

let relativeTime = '';
if (diffInDays === 0) relativeTime = 'today';
else if (diffInDays === 1) relativeTime = 'yesterday';
else relativeTime = `${diffInDays} days ago`;
```

Also changes "1 day ago" to "yesterday" for more natural language.

## 3. Reduce Lead Information card height

**File**: `src/components/lead-details/LeadCenterTabs.tsx` (line 38)

Change from `h-[calc(100vh-240px)]` to `h-[calc(100vh-280px)]` to reduce the white space at the bottom, making the card end closer to where the Stage History card ends on the right.

## Summary

| File | Change |
|------|--------|
| `ClientDetailDrawer.tsx` | Move Chat with Borrower chevron to left side (both instances); fix date diff to use calendar days and "yesterday" |
| `LeadCenterTabs.tsx` | Change height from `calc(100vh-240px)` to `calc(100vh-280px)` |

