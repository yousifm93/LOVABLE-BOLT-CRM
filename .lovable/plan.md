

# Plan: Lender Marketing Update Suggestions System

## Overview
Add a notification indicator next to "Approved Lenders" in the sidebar that opens a modal showing pending lender marketing updates from emails. Users can approve/deny suggestions to update lender records directly from the modal.

---

## Summary of Changes

| Component | Description |
|-----------|-------------|
| New Hook | `useLenderMarketingSuggestions` - fetch, approve, deny lender field suggestions |
| New Modal | `LenderMarketingSuggestionsModal` - displays pending/completed suggestions |
| Sidebar Update | Add badge and click handler for "Approved Lenders" item |
| Time Filter | Show last 24 hours of suggestions by default |

---

## Current State
- 1,414 pending lender field suggestions already exist in `lender_field_suggestions` table
- Table schema includes: `id`, `email_log_id`, `lender_id`, `is_new_lender`, `suggested_lender_name`, `field_name`, `current_value`, `suggested_value`, `confidence`, `reason`, `status`, `created_at`, `processed_at`, `processed_by`
- `LenderMarketingPopover` already has approve/deny logic for individual emails

---

## Detailed Implementation

### 1. Create New Hook: `useLenderMarketingSuggestions`

**File:** `src/hooks/useLenderMarketingSuggestions.tsx`

This hook mirrors `useEmailSuggestions` but for lender field suggestions:

```typescript
export interface LenderFieldSuggestion {
  id: string;
  email_log_id: string;
  lender_id: string | null;
  is_new_lender: boolean;
  suggested_lender_name: string | null;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  confidence: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  processed_at?: string | null;
  processed_by?: string | null;
  lender?: { lender_name: string };
  email_log?: { subject: string; from_email: string; timestamp: string };
}

export function useLenderMarketingSuggestions() {
  // State: suggestions, completedSuggestions, pendingCount, isLoading, isLoadingCompleted
  // Methods: fetchSuggestions, fetchPendingCount, approveSuggestion, denySuggestion
  // Real-time subscription for count updates
}
```

**Key Functions:**
- `fetchSuggestions(status, hours = 24)` - Filter by last 24 hours by default
- `approveSuggestion(suggestion)` - Update lender field OR create new lender
- `denySuggestion(suggestionId)` - Mark as denied
- `fetchCompletedSuggestions()` - Get approved/denied items

---

### 2. Create New Modal: `LenderMarketingSuggestionsModal`

**File:** `src/components/modals/LenderMarketingSuggestionsModal.tsx`

Structure mirrors `EmailFieldSuggestionsModal`:

```text
+--------------------------------------------------+
| [Building Icon] Lender Marketing Updates         |
+--------------------------------------------------+
| [Pending (12)] [Completed]     [Last 24h ▾]      |
+--------------------------------------------------+
|                                                  |
|  ▼ Angel Oak Mortgage (3 suggestions)            |
|  +----------------------------------------------+
|  | max_loan_amount                              |
|  | $2,000,000 → $3,500,000                     |
|  | "Email mentions Max Loan Amount..."          |
|  |                              [✗] [✓]         |
|  +----------------------------------------------+
|  | product_dscr                                 |
|  | Empty → Y                                    |
|  | "Email mentions DSCR Product: Y"             |
|  |                              [✗] [✓]         |
|  +----------------------------------------------+
|                                                  |
|  ▼ NEW: Velocity Mortgage (1 suggestion)        |
|  +----------------------------------------------+
|  | Add New Lender                               |
|  | Create "Velocity Mortgage" in Not Approved   |
|  |                    [Link Existing] [✗] [✓]   |
|  +----------------------------------------------+
|                                                  |
+--------------------------------------------------+
```

**Features:**
- Tabs: Pending | Completed
- Time filter dropdown: Last 24 Hours (default) | Last 7 Days | All Time
- Group by lender (existing or new)
- For new lenders: option to "Link to Existing" or "Add as New"
- Approve/Deny buttons on each suggestion
- Click lender name to navigate to lender detail
- "Deny All" button per lender group

---

### 3. Update AppSidebar for Approved Lenders Badge

**File:** `src/components/AppSidebar.tsx`

**Add new state and subscription:**
```typescript
const [pendingLenderSuggestionCount, setPendingLenderSuggestionCount] = useState(0);
const [lenderSuggestionsModalOpen, setLenderSuggestionsModalOpen] = useState(false);

// Fetch pending lender suggestion count (last 24 hours)
useEffect(() => {
  const fetchPendingCount = async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('lender_field_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('created_at', twentyFourHoursAgo);
    setPendingLenderSuggestionCount(count || 0);
  };
  // ... real-time subscription
}, []);
```

**Update Approved Lenders menu item (around line 661-700):**
```typescript
{item.title === "Approved Lenders" ? (
  <NavLink to={item.url} className={getNavClassName}>
    <item.icon className="mr-2 h-4 w-4" />
    {!collapsed && (
      <span className="flex items-center gap-2">
        {item.title}
        {pendingLenderSuggestionCount > 0 && (
          <Badge 
            variant="destructive" 
            className="h-5 min-w-5 px-1.5 text-xs cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLenderSuggestionsModalOpen(true);
            }}
          >
            {pendingLenderSuggestionCount}
          </Badge>
        )}
      </span>
    )}
  </NavLink>
) : ...
```

**Add modal at end of component:**
```typescript
<LenderMarketingSuggestionsModal
  open={lenderSuggestionsModalOpen}
  onOpenChange={setLenderSuggestionsModalOpen}
/>
```

---

## Visual Flow

```text
Sidebar                    Modal (on badge click)
+------------------+       +--------------------------------+
| CONTACTS         |       | Lender Marketing Updates       |
|  - Agents        |       +--------------------------------+
|  - Contacts      |       | [Pending (7)] [Completed]      |
|  - Approved [7]◄─────────| Time: [Last 24 Hours ▾]        |
+------------------+       +--------------------------------+
        │                  | ▼ Angel Oak (2)               |
        │                  |   max_loan: $2M→$3.5M    [✗][✓]|
        │                  |   product_dscr: →Y       [✗][✓]|
        │                  +--------------------------------+
        │                  | ▼ NEW: Velocity (1)           |
        │                  |   Add new lender         [✗][✓]|
        │                  +--------------------------------+
        │
   Click badge opens modal
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useLenderMarketingSuggestions.tsx` | Hook for fetching and managing lender suggestions |
| `src/components/modals/LenderMarketingSuggestionsModal.tsx` | Modal UI for pending/completed suggestions |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AppSidebar.tsx` | Add badge to Approved Lenders, add modal state, render modal |

---

## Database

No database changes needed - the `lender_field_suggestions` table already exists with all required fields:
- `status`: pending, approved, denied
- `is_new_lender`: boolean to identify new lender suggestions
- `suggested_lender_name`: name for new lenders
- `lender_id`: reference to existing lender (when updating)
- `field_name`, `current_value`, `suggested_value`: field update details

---

## Approval Logic

When approving a suggestion:

**For existing lender updates:**
1. Update the lender field in `lenders` table
2. Mark suggestion as `approved` with `processed_at` and `processed_by`

**For new lender creation:**
1. Create new lender in `lenders` table with status "Pending" (goes to Not Approved section)
2. Populate available fields from email extraction data
3. Mark suggestion as `approved`

**For "Link to Existing" option:**
1. Update the existing lender with extracted data
2. Mark suggestion as `approved` and set `lender_id`

---

## Time Filtering

The modal will default to showing suggestions from the last 24 hours but include a dropdown to expand:
- Last 24 Hours (default)
- Last 7 Days
- All Time

This prevents the UI from being overwhelmed by the 1,400+ pending suggestions while still allowing users to see older items if needed.

