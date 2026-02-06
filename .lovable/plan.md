

# Fix Chat with Borrower Arrow Direction + Reduce Lead Information Card Height

## 1. Chat with Borrower chevron: Use ChevronRight with rotation (not ChevronDown)

The other three sections (Quick Actions, DTI, Third Party Items) use `ChevronRight` with a CSS rotation on open:
```tsx
<ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
```

Chat with Borrower currently uses `ChevronDown` which always points down. Both instances (lines 2250 and 2630) will be changed to match the right-arrow pattern.

**File**: `src/components/ClientDetailDrawer.tsx`

- **Line 2250**: Change `<ChevronDown className="h-4 w-4 text-muted-foreground" />` to `<ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />`
- **Line 2630**: Same change for the Active/PastClient instance
- The `CollapsibleTrigger` wrapping also needs to match the pattern used by Quick Actions (using `className="flex items-center gap-2 ..."` directly on CollapsibleTrigger rather than on CardHeader > CardTitle)

Both instances will be updated to use the same trigger structure as Quick Actions:
```tsx
<CardHeader className="pb-3">
  <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full">
    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
    <CardTitle className="text-sm font-semibold">Chat with Borrower</CardTitle>
  </CollapsibleTrigger>
</CardHeader>
```

## 2. Reduce Lead Information card height

The card is currently too tall with excessive white space at the bottom. The height will be reduced from `h-[calc(100vh-280px)]` to `h-[calc(100vh-340px)]`, which removes roughly 60px of white space, bringing the bottom edge closer to where Stage History ends on the right.

**File**: `src/components/lead-details/LeadCenterTabs.tsx` (line 38)

## Summary

| File | Change |
|------|--------|
| `ClientDetailDrawer.tsx` | Both Chat with Borrower instances: replace `ChevronDown` with `ChevronRight` + rotation pattern, restructure trigger to match Quick Actions |
| `LeadCenterTabs.tsx` | Height from `calc(100vh-280px)` to `calc(100vh-340px)` |
