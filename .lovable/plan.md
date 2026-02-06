

# Move DTI/Address/PITI to Right Column for Screening

## Overview
Move the DTI/Address/PITI card from the left column to the right column, positioning it above Stage History, for the Screening stage only.

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

**1. Exclude Screening from left-column DTI/Address/PITI (Line ~2526)**

Update the condition to no longer include screening:

```
Before:
{(opsStage === 'screening' || opsStage === 'pre-qualified' || opsStage === 'pre-approved') && (

After:
{(opsStage === 'pre-qualified' || opsStage === 'pre-approved') && (
```

**2. Add DTI/Address/PITI to right column above Stage History (before Line ~2945)**

Insert the component right before the Stage History card, only for the screening stage:

```tsx
{/* DTI / Address / PITI - Screening stage, right column */}
{(() => {
  const opsStage = client.ops?.stage?.toLowerCase() || '';
  if (opsStage !== 'screening') return null;
  return (
    <LeadTeamContactsDatesCard 
      leadId={leadId || ""} 
      onLeadUpdated={onLeadUpdated} 
    />
  );
})()}
```

## Result
- Right column order for Screening: DTI/Address/PITI -> Stage History -> Quick Actions
- Pre-Qualified and Pre-Approved stages remain unchanged (DTI stays in left column)

