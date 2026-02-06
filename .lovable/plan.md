

# Match Pre-Qualified and Pre-Approved Layout to Screening

## Overview
Replicate the screening stage's right-column layout for pre-qualified and pre-approved stages. This means moving certain sections from the center column to the right column and making Stage History collapsible.

## Current vs Target Layout

### Right Column (target for all three stages)
1. Tasks
2. Latest File Update
3. Quick Actions
4. Stage History (collapsible, collapsed by default)

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

**1. Remove Quick Actions from center column for pre-qualified/pre-approved**

Delete the Quick Actions block in the center column (lines ~2658-2700) that currently renders only for pre-qualified/pre-approved. These will be handled by the right-column block instead.

**2. Remove Latest File Update from left column for pre-qualified/pre-approved**

The Latest File Update card at lines ~2468-2530 currently renders for pre-qualified/pre-approved in the left column. Remove those stages from its condition so it no longer appears there.

**3. Expand the right-column Latest File Update to include pre-qualified/pre-approved**

The screening-only Latest File Update block in the right column (lines ~2860-2950) currently checks `if (opsStage !== 'screening') return null`. Change this to also include pre-qualified and pre-approved stages.

**4. Expand the right-column Quick Actions to include pre-qualified/pre-approved**

The screening-only Quick Actions block (lines ~2952-2977) currently checks `if (opsStage !== 'screening') return null`. Change this to also include pre-qualified and pre-approved stages.

**5. Make Stage History collapsible for pre-qualified/pre-approved**

Update the Stage History card's `isScreening` variable (line ~2982) to also match pre-qualified and pre-approved stages:
```tsx
const isCollapsibleStage = ['screening', 'pre-qualified', 'pre-approved'].includes(opsStage);
```
Replace all `isScreening` references in the Stage History block with `isCollapsibleStage`.

## Result
- Pre-qualified and pre-approved right columns will match screening: Tasks, Latest File Update, Quick Actions, Stage History (collapsible, collapsed by default)
- Center column will no longer have Quick Actions for these stages
- Left column will no longer have Latest File Update for these stages
- All other stages remain unaffected
