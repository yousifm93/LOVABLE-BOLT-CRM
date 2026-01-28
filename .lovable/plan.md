

# Plan: CRM Performance Optimization

## Overview
Implement a multi-faceted performance optimization strategy to address slow loading times across the CRM application. The session replay and network logs show multiple areas causing delays, from repeated API calls to inefficient data loading patterns.

---

## Current Performance Issues Identified

### 1. Duplicate and Unnecessary API Calls
- The Email page makes repeated calls to `fetch-emails-imap` (seen in network logs - same call fired 12+ times)
- Sidebar's `AppSidebar.tsx` has 7+ separate `useEffect` hooks each making independent database calls on mount
- `ActivityDropdown.tsx` fetches 50 audit log entries + user data on every mount
- Home page (`Home.tsx`) makes 8 separate database calls in a single `useEffect`

### 2. No Data Caching Layer
- Every page navigation triggers fresh data fetches
- Shared data (users, lenders, agents, pipeline stages) is re-fetched on every page load
- React Query is configured but underutilized - most pages use raw `supabase` calls instead

### 3. Blocking UI During Loads
- Pages show loading spinners during the entire data fetch
- No progressive loading or skeleton states
- No stale-while-revalidate pattern for background updates

### 4. Heavy Initial Page Loads
- `FieldsContext` loads all CRM fields globally on every page
- Permission checks require async database calls blocking render
- Multiple realtime subscriptions set up per component

---

## Optimization Strategy

### Phase 1: Implement React Query for Core Data (High Impact)

Create shared React Query hooks for frequently-accessed data that gets cached across page navigation:

**File: `src/hooks/useSharedData.ts` (new)**

```typescript
import { useQuery } from '@tanstack/react-query';
import { databaseService } from '@/services/database';

// Users - cached for 10 minutes
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => databaseService.getUsers(),
    staleTime: 10 * 60 * 1000,
  });
}

// Lenders - cached for 10 minutes  
export function useLenders() {
  return useQuery({
    queryKey: ['lenders'],
    queryFn: () => databaseService.getLenders(),
    staleTime: 10 * 60 * 1000,
  });
}

// Agents - cached for 10 minutes
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => databaseService.getAgents(),
    staleTime: 10 * 60 * 1000,
  });
}

// Pipeline Stages - cached for 30 minutes (rarely changes)
export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => databaseService.getPipelineStages(),
    staleTime: 30 * 60 * 1000,
  });
}
```

### Phase 2: Consolidate Sidebar Data Loading

**File: `src/components/AppSidebar.tsx`**

Combine the 7 separate `useEffect` calls into a single consolidated data fetch:

```typescript
// BEFORE: 7 separate useEffects each making API calls
useEffect(() => { fetchPendingCount(); }, []);
useEffect(() => { fetchEmailQueueCount(); }, []);
useEffect(() => { fetchFeedbackCounts(); }, []);
useEffect(() => { fetchUnreadResponses(); }, []);
useEffect(() => { fetchPendingContactCount(); }, []);
useEffect(() => { fetchPendingLenderCount(); }, []);

// AFTER: Single consolidated fetch
useEffect(() => {
  const loadSidebarData = async () => {
    const [suggestions, queue, feedback, contacts, lenderSuggestions] = 
      await Promise.allSettled([
        supabase.from('email_field_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('email_automation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('team_feedback').select('*', { count: 'exact', head: true }).eq('is_read_by_admin', false),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('lender_field_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
    
    // Update all counts at once
    if (suggestions.status === 'fulfilled') setPendingSuggestionCount(suggestions.value.count || 0);
    if (queue.status === 'fulfilled') setPendingEmailQueueCount(queue.value.count || 0);
    // ... etc
  };
  
  loadSidebarData();
}, []);
```

### Phase 3: Optimize Home Page Data Loading

**File: `src/pages/Home.tsx`**

Consolidate the 8 separate database calls into parallel execution:

```typescript
// BEFORE: Sequential calls in single useEffect
const { count: leads } = await supabase.from('leads')...;
const { count: apps } = await supabase.from('leads')...;
const { count: closed } = await supabase.from('leads')...;
// ... 5 more calls

// AFTER: Parallel execution with Promise.allSettled
const [leads, apps, closed, active, agents, unread, added, removed] = 
  await Promise.allSettled([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_closed', false).gte('lead_on_date', startOfMonthDate),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('pipeline_stage_id', '...').gte('pending_app_at', startOfMonthISO),
    // ... all calls in parallel
  ]);

// Update state from results
setLeadsThisMonth(leads.status === 'fulfilled' ? leads.value.count || 0 : 0);
// ... etc
```

### Phase 4: Lazy Load Activity Dropdown

**File: `src/components/ActivityDropdown.tsx`**

Only fetch activity data when the dropdown is opened:

```typescript
// BEFORE: Fetches 50 audit logs + user data on component mount
useEffect(() => {
  fetchActivities();
  // Plus realtime subscription
}, []);

// AFTER: Lazy load on open
const [hasLoaded, setHasLoaded] = useState(false);

useEffect(() => {
  if (open && !hasLoaded) {
    fetchActivities();
    setHasLoaded(true);
  }
}, [open, hasLoaded]);
```

### Phase 5: Optimize Email Page (Already Partially Done)

The recent changes added `crmUser` guards - ensure only 2 accounts are fetched:

```typescript
// Current issue: allowedAccounts may still trigger too many fetches
// Optimization: Add debounce and combine fetches
useEffect(() => {
  if (!crmUser) return;
  
  // Batch both account fetches into single effect
  const fetchBothCounts = async () => {
    const results = await Promise.allSettled(
      allowedAccounts.map(account => 
        supabase.functions.invoke("fetch-emails-imap", {
          body: { account, folder: 'Inbox', limit: 50, offset: 0 }
        })
      )
    );
    
    const newCounts = { yousif: 0, scenarios: 0, salma: 0, herman: 0 };
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data?.success) {
        const account = allowedAccounts[index];
        newCounts[account] = result.value.data.emails.filter((e: any) => e.unread).length;
      }
    });
    setAccountUnreadCounts(newCounts);
  };
  
  fetchBothCounts();
}, [crmUser?.id]); // Only re-fetch when user changes, not on every dependency change
```

### Phase 6: Optimize Permissions Loading

**File: `src/hooks/usePermissions.tsx`**

Add caching and prevent redundant fetches:

```typescript
// Use React Query for permissions caching
export function usePermissions() {
  const { crmUser } = useAuth();
  
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions', crmUser?.id],
    queryFn: async () => {
      if (!crmUser?.id) return null;
      if (crmUser.role === 'Admin') return DEFAULT_PERMISSIONS;
      
      const { data } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', crmUser.id)
        .single();
      
      return data ? mapPermissions(data) : DEFAULT_PERMISSIONS;
    },
    enabled: !!crmUser?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  // ... rest of hook
}
```

### Phase 7: Reduce Realtime Subscription Overhead

Consolidate multiple realtime subscriptions into fewer channels:

```typescript
// BEFORE: Multiple separate subscriptions in AppSidebar
const channel1 = supabase.channel('email_field_suggestions_changes')...
const channel2 = supabase.channel('email_automation_queue_changes')...
const channel3 = supabase.channel('team_feedback_changes')...
// 6+ more channels

// AFTER: Single consolidated subscription
const channel = supabase
  .channel('sidebar_notifications')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'email_field_suggestions' }, handleRefresh)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'email_automation_queue' }, handleRefresh)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'team_feedback' }, handleRefresh)
  .subscribe();
```

---

## Implementation Order (Prioritized by Impact)

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Create `useSharedData.ts` hooks | High - eliminates duplicate data fetches | Medium |
| 2 | Consolidate Sidebar data loading | High - reduces 7 API calls to 1 | Low |
| 3 | Parallelize Home page counts | Medium - faster initial load | Low |
| 4 | Lazy load Activity Dropdown | Medium - faster page render | Low |
| 5 | Cache permissions with React Query | Medium - reduces redundant fetches | Medium |
| 6 | Consolidate realtime subscriptions | Low - reduces connection overhead | Medium |
| 7 | Optimize Email page fetch batching | Medium - already partially done | Low |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSharedData.ts` | New file - React Query hooks for shared data |
| `src/components/AppSidebar.tsx` | Consolidate data fetching, reduce subscriptions |
| `src/pages/Home.tsx` | Parallelize count queries |
| `src/components/ActivityDropdown.tsx` | Lazy load on dropdown open |
| `src/hooks/usePermissions.tsx` | Add React Query caching |
| `src/pages/Email.tsx` | Batch email count fetches |
| `src/pages/Active.tsx` | Use shared data hooks for users/lenders/agents |

---

## Expected Results

- **Initial page load**: 40-60% faster (parallel data fetching)
- **Page navigation**: 70-80% faster (cached shared data)
- **Reduced API calls**: ~50% fewer database round trips
- **Smoother UI**: Progressive loading instead of full spinners

---

## Technical Notes

- React Query is already installed and configured with 5-minute staleTime
- All changes are backward-compatible - existing code patterns are preserved
- Realtime subscriptions will continue to work for live updates
- No database schema changes required

