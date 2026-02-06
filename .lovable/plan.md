
# Fix: "About the Borrower" and "Latest File Update" Not Persisting

## Root Cause

The data IS saving to the database successfully, but **the drawer's parent component (`LeadsModern.tsx`) does not refresh the selected lead after saving**. Here is the flow:

1. User types in "About the Borrower" or "Latest File Update" and clicks Save
2. Data saves to the `leads` table in Supabase (confirmed working)
3. `onLeadUpdated` callback fires, which calls `loadData()` to refresh the leads list
4. **Problem**: `selectedLead` (the state variable passed to the drawer as `client`) is never updated
5. The drawer's sync useEffect sees the stale `client` prop and resets local state to the old (empty) values
6. When the user closes and re-opens the drawer, the stale `selectedLead` is passed again

The `Leads.tsx` page handles this correctly by re-fetching the specific lead and calling `setSelectedClient(crmClient)` after save. `LeadsModern.tsx` does not do this.

## Fix

### File: `src/pages/LeadsModern.tsx`

Update the `onLeadUpdated` callback (lines 695-697) to also refresh `selectedLead` with fresh data from the database:

```typescript
onLeadUpdated={async () => {
  await loadData();
  // Refresh selectedLead with fresh data
  if (selectedLead) {
    const leadId = (selectedLead as any).databaseId || (selectedLead as any).id;
    if (leadId) {
      const { data: freshLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      if (freshLead) {
        const agentMap = new Map(buyerAgents.map(a => [a.id, a]));
        const userMap = new Map(users.map(u => [u.id, u]));
        const enriched = {
          ...freshLead,
          buyer_agent: freshLead.buyer_agent_id ? agentMap.get(freshLead.buyer_agent_id) : null,
          teammate: freshLead.teammate_assigned ? userMap.get(freshLead.teammate_assigned) : null,
        };
        const crmClient = transformLeadToClient(enriched);
        setSelectedLead(crmClient as any);
      }
    }
  }
}}
```

This ensures the drawer receives an updated `client` prop with the freshly saved `notes` and `latest_file_updates` values after every save.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LeadsModern.tsx` | Update `onLeadUpdated` to refresh `selectedLead` after save |

## Result

After this fix:
- "About the Borrower" text persists after saving and reopening the drawer
- "Latest File Update" text persists after saving and reopening the drawer
- The metadata footer (last updated timestamp and user) also displays correctly
- No database or schema changes needed -- the data was already saving correctly
