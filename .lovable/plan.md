

# Move Quick Actions, DTI/PITI, and Third Party Items to Left Column + Unify Styles + Extend Lead Information Height

## Overview

Three changes:
1. Move "Quick Actions", "DTI, Address & PITI", and "Third Party Items" from the right column to the left column, positioned after "Chat with Borrower"
2. Unify the collapsible header style across all three so they look identical
3. Increase the Lead Information card height to show ~6 activity items instead of 5

## 1. Move sections to left column (after Chat with Borrower)

**File**: `src/components/ClientDetailDrawer.tsx`

Currently for Leads/Pending App stage:
- Quick Actions is in the **right column** (~line 3091)
- DTI, Address & PITI is in the **right column** (~line 3141)
- Third Party Items is in the **right column** (~line 3156)

These will be **removed** from the right column and **added** to the left column, immediately after the "Chat with Borrower" section (~line 2285), in this order:
1. Quick Actions
2. DTI, Address & PITI
3. Third Party Items

The stage-conditional logic (`isLeadsOrPendingApp`) will be preserved.

## 2. Unify collapsible header styles

Currently the three sections use inconsistent patterns:

| Section | Title class | Icon | Icon position |
|---------|------------|------|---------------|
| Quick Actions | `text-sm font-bold` | ChevronDown only | Right side |
| DTI, Address & PITI | `text-base font-medium` | ChevronRight/Down toggle | Left side |
| Third Party Items | `text-base font-medium` | ChevronRight/Down toggle | Left side |

All three will be unified to use the **left-arrow** pattern (matching DTI and Third Party Items):

- `CardTitle` with `text-sm font-semibold`
- `ChevronRight` when collapsed, `ChevronDown` when expanded, positioned to the **left** of the title
- Same `CardHeader` padding: `pb-3`
- Same hover behavior on the trigger

**Files modified**:
- `src/components/ClientDetailDrawer.tsx` -- Quick Actions header will be updated inline
- `src/components/lead-details/LeadTeamContactsDatesCard.tsx` -- Update `text-base font-medium` to `text-sm font-semibold`
- `src/components/lead-details/LeadThirdPartyItemsCard.tsx` -- Update `text-base font-medium` to `text-sm font-semibold`

## 3. Extend Lead Information card height

**File**: `src/components/lead-details/LeadCenterTabs.tsx`

Currently uses `h-[calc(100vh-300px)]` (line 38). This will be changed to `h-[calc(100vh-240px)]` to add approximately 60px more vertical space, enough to show ~6 activity entries before needing to scroll instead of the current ~5.

## Summary of file changes

| File | Change |
|------|--------|
| `ClientDetailDrawer.tsx` | Move Quick Actions, DTI/PITI, Third Party Items from right column to left column after Chat with Borrower; update Quick Actions header to match unified collapsible style |
| `LeadTeamContactsDatesCard.tsx` | Change title from `text-base font-medium` to `text-sm font-semibold` |
| `LeadThirdPartyItemsCard.tsx` | Change title from `text-base font-medium` to `text-sm font-semibold` |
| `LeadCenterTabs.tsx` | Change height from `calc(100vh-300px)` to `calc(100vh-240px)` |
