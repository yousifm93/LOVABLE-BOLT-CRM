
# Plan: Fix Global Sidebar Search for Agents & Contacts

## Summary

The global search bar currently shows "No results found" when searching for agents or contacts, even though the code to search these tables exists. Investigation shows the data exists and RLS policies allow access. The issue is likely a silent error being caught without surfacing to the user.

---

## Root Cause Analysis

The current search code (lines 180-255 in AppSidebar.tsx) already includes queries for:
- `buyer_agents` (Real Estate Agents)
- `contacts` (Master Contact List)

However, the user reports no results appear. Possible causes:

1. **Silent Query Failures**: Errors are caught at line 250-251 but the `results` array stays empty if the queries fail
2. **Individual Query Errors Not Logged**: Each query's error response is not being checked (only checking `data`)
3. **Null Field Handling**: The `.or()` filter might have issues with null values

---

## Solution

Improve the search implementation with proper error handling for each query and ensure all entity types are included in results:

1. **Add explicit error checking** for each Supabase query
2. **Add console logging** for debugging (can be removed later)
3. **Run queries in parallel** using Promise.all for better performance
4. **Ensure robustness** with null-safe field handling

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/AppSidebar.tsx` | Refactor handleSearch to use Promise.all and add error checking per query |

---

## Technical Details

### Current Implementation (lines 180-255)

```typescript
const handleSearch = useCallback(async (term: string) => {
  // ...
  try {
    const results: SearchResult[] = [];
    
    // Search leads
    const { data: leads } = await supabase.from('leads')...
    
    // Search agents
    const { data: agents } = await supabase.from('buyer_agents')...
    
    // Search lenders  
    const { data: lenders } = await supabase.from('lenders')...
    
    // Search contacts
    const { data: contacts } = await supabase.from('contacts')...
    
    setSearchResults(results);
  } catch (error) {
    console.error('Search error:', error);
  }
});
```

### Proposed Implementation

```typescript
const handleSearch = useCallback(async (term: string) => {
  if (term.length < 2) {
    setSearchResults([]);
    setShowSearchResults(false);
    return;
  }
  
  setIsSearching(true);
  setShowSearchResults(true);
  
  try {
    const results: SearchResult[] = [];
    
    // Run all searches in parallel for better performance
    const [leadsResult, agentsResult, lendersResult, contactsResult] = await Promise.all([
      // Search leads
      supabase
        .from('leads')
        .select('id, first_name, last_name, email, pipeline_stage_id')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5),
      
      // Search agents (Real Estate Agents)
      supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,brokerage.ilike.%${term}%`)
        .is('deleted_at', null)
        .limit(5),
      
      // Search lenders
      supabase
        .from('lenders')
        .select('id, lender_name, account_executive')
        .or(`lender_name.ilike.%${term}%,account_executive.ilike.%${term}%`)
        .limit(5),
      
      // Search contacts (Master Contact List)
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email, type')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5),
    ]);
    
    // Process leads with error logging
    if (leadsResult.error) {
      console.error('Leads search error:', leadsResult.error);
    } else if (leadsResult.data) {
      results.push(...leadsResult.data.map(l => ({
        id: l.id,
        type: 'lead' as const,
        name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
        subtext: l.pipeline_stage_id ? PIPELINE_STAGE_NAMES[l.pipeline_stage_id] || 'Unknown Stage' : 'Lead',
        pipelineStageId: l.pipeline_stage_id,
      })));
    }
    
    // Process agents with error logging
    if (agentsResult.error) {
      console.error('Agents search error:', agentsResult.error);
    } else if (agentsResult.data) {
      results.push(...agentsResult.data.map(a => ({
        id: a.id,
        type: 'agent' as const,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown',
        subtext: a.brokerage || 'Realtor',
      })));
    }
    
    // Process lenders with error logging
    if (lendersResult.error) {
      console.error('Lenders search error:', lendersResult.error);
    } else if (lendersResult.data) {
      results.push(...lendersResult.data.map(l => ({
        id: l.id,
        type: 'lender' as const,
        name: l.lender_name || 'Unknown',
        subtext: l.account_executive || undefined,
      })));
    }
    
    // Process contacts with error logging
    if (contactsResult.error) {
      console.error('Contacts search error:', contactsResult.error);
    } else if (contactsResult.data) {
      results.push(...contactsResult.data.map(c => ({
        id: c.id,
        type: 'contact' as const,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        subtext: c.type || 'Contact',
      })));
    }
    
    setSearchResults(results);
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    setIsSearching(false);
  }
}, []);
```

---

## Key Improvements

1. **Parallel Queries**: Using `Promise.all` for all 4 searches runs them concurrently instead of sequentially
2. **Individual Error Handling**: Each query's error is checked and logged separately
3. **Graceful Degradation**: If one query fails, the others still contribute their results
4. **Better Subtext**: Agents without a brokerage now show "Realtor" as subtext instead of empty

---

## Expected Results

After this change:
- Searching "david f" in the global search bar will show:
  - David Jimenez, David Jauregui, David Fraine, etc. (from buyer_agents)
  - David Gross, David Helfman (from contacts)
  - Any matching leads or lenders

---

## Testing Steps

1. Type "david f" in the global sidebar search bar
2. Verify results appear from multiple categories (agents, contacts, leads, lenders)
3. Click on an agent result → Should navigate to `/contacts/agents?openAgent={id}`
4. Click on a contact result → Should navigate to `/contacts/borrowers?openContact={id}`
5. Check browser console for any error messages
