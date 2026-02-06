

# Reorder Quick Actions and Make Stage History Collapsible (Screening)

## Overview
For the screening stage right column, reorder sections and make Stage History collapsible. New order: Tasks -> Latest File Update -> Quick Actions -> Stage History (collapsible).

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

**1. Move Quick Actions above Stage History (swap blocks at lines 2951-3185)**

Cut the Quick Actions block (lines 3160-3185) and paste it before the Stage History card (before line 2951). This changes the right column order to:
- Tasks
- Latest File Update
- Quick Actions
- Stage History

**2. Make Stage History collapsible for screening**

Wrap the Stage History card in a collapsible pattern (matching the unified header style from the memory context). For the screening stage only, replace the static CardHeader with a clickable header using ChevronRight that rotates 90 degrees when open. The content area toggles visibility based on a local state variable.

### Technical Details

The Stage History card (lines 2951-3158) will be updated:

```tsx
{(() => {
  const opsStage = client.ops?.stage?.toLowerCase() || '';
  const isScreening = opsStage === 'screening';
  // For screening, use collapsible state; for others, always open
  return (
    <Card>
      <CardHeader 
        className={cn("pb-3 bg-white", isScreening && "cursor-pointer")}
        onClick={() => isScreening && setStageHistoryOpen(!stageHistoryOpen)}
      >
        <div className="flex items-center gap-2">
          {isScreening && (
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              stageHistoryOpen && "rotate-90"
            )} />
          )}
          <CardTitle className="text-sm font-semibold">Stage History</CardTitle>
        </div>
      </CardHeader>
      {(isScreening ? stageHistoryOpen : true) && (
        <CardContent ...>
          {/* existing stage history content */}
        </CardContent>
      )}
    </Card>
  );
})()}
```

A new state variable `stageHistoryOpen` (defaulting to `false`) will be added near the top of the component with the other state declarations.

## Result
- Right column order for Screening: Tasks -> Latest File Update -> Quick Actions -> Stage History (collapsed by default)
- Other stages are unaffected -- Stage History remains non-collapsible
- Collapsible header follows the unified pattern (ChevronRight rotating 90 degrees, text-sm font-semibold)

