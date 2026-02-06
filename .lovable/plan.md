

# Move Quick Actions to Right Column and Remove Third Party Items (Screening Page)

## Overview
On the Screening page, Quick Actions currently appears in the left column and Third Party Items also appears in the left column. We will move Quick Actions to the right column (underneath Stage History) and completely remove Third Party Items from the Screening stage.

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

**1. Exclude Screening from left-column Quick Actions (Line ~2284-2287)**

Update the condition so that the left-column Quick Actions also returns null for the screening stage, preventing it from rendering there.

```
Before:
const isPreQualOrPreApproved = opsStage === 'pre-qualified' || opsStage === 'pre-approved';
if (isPreQualOrPreApproved) return null;

After:
const isPreQualOrPreApproved = opsStage === 'pre-qualified' || opsStage === 'pre-approved';
if (isPreQualOrPreApproved || opsStage === 'screening') return null;
```

**2. Exclude Screening from Third Party Items (Line ~2346)**

Add screening to the exclusion list so Third Party Items no longer renders on the Screening page.

```
Before:
if (isActiveOrPastClient || opsStage === 'leads' || opsStage === 'pending-app') return null;

After:
if (isActiveOrPastClient || opsStage === 'leads' || opsStage === 'pending-app' || opsStage === 'screening') return null;
```

**3. Add Quick Actions to right column after Stage History (after Line ~3152)**

Insert the Quick Actions card (Pre-Approval and Loan Estimate buttons) in the right column, right after the Stage History card and before the closing div. This will only render when the stage is "screening."

```tsx
{/* Quick Actions - Screening stage, right column */}
{opsStage === 'screening' && (
  <Card>
    <CardHeader className="pb-3 bg-white">
      <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
    </CardHeader>
    <CardContent className="bg-gray-50">
      <div className="flex gap-3">
        <Button variant="outline" size="default" className="flex-1 px-3 py-3 h-auto flex flex-col gap-1"
          onClick={() => setShowPreApprovalModal(true)}>
          <FileText className="h-4 w-4" />
          <span className="font-semibold text-sm">Pre-Approval</span>
        </Button>
        <Button variant="outline" size="default" className="flex-1 px-3 py-3 h-auto flex flex-col gap-1"
          onClick={() => setShowLoanEstimateModal(true)}>
          <FileCheck className="h-4 w-4" />
          <span className="font-semibold text-sm">Loan Estimate</span>
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

## Result
- Stage History remains at the top of the right column
- Quick Actions appears directly below Stage History (screening only)
- Third Party Items is completely removed from the Screening page

