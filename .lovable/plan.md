

# Hide DTI/PITI and Third Party Items in Leads Stage

The user wants to hide the "DTI, Address & PITI" and "Third Party Items" collapsible sections when viewing a lead that is in the "leads" stage (i.e., from the /leads page).

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

**1. DTI / Address / PITI section (lines 2331-2344)**

Currently shows for `leads` and `pending-app` stages. Change the condition so it only shows for `pending-app`:

```
// Before (line 2335):
const isLeadsOrPendingApp = opsStage === 'leads' || opsStage === 'pending-app';

// After:
const isLeadsOrPendingApp = opsStage === 'pending-app';
```

**2. Third Party Items section (lines 2346-2354)**

Currently shows for all non-Active/Past-Client stages (including leads). Add an exclusion for the `leads` stage:

```
// Before (line 2350):
if (isActiveOrPastClient) return null;

// After:
if (isActiveOrPastClient || opsStage === 'leads') return null;
```

## Result

Both sections will be hidden when viewing a lead in the "leads" stage. They will continue to appear for Pending App, Screening, Pre-Qualified, Pre-Approved, Active, and Past Clients stages as appropriate.
