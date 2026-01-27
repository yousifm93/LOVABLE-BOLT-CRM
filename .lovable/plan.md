
# Plan: Fix Pipeline Validation Modal Dropdown Visibility

## Problem
When switching a lead to "Pending App", the "Action Required" modal appears but the "Likely to Apply" dropdown options are not visible. Users have to click outside the dropdown area (gray area) to see the options, which is frustrating and confusing.

## Root Cause Analysis
Looking at the code:

1. **The Modal** (`ClientDetailDrawer.tsx` line 3180):
   - Uses `<DialogContent className="max-w-lg">` (512px width)
   - The `DialogContent` component has `z-50` for stacking

2. **The Dropdown** (`inline-edit-select.tsx` line 148):
   - Uses `DropdownMenuContent` which renders via a **portal** 
   - Also has `z-50` class

3. **The Conflict**:
   - Both the dialog and dropdown have the same z-index (`z-50`)
   - Radix portals render at the body level, but when both have the same z-index, the dropdown may not reliably appear on top of the dialog overlay
   - The dropdown is rendering but appears behind or partially obscured by the dialog's backdrop

## Solution

Update the `InlineEditSelect` component to use a higher z-index (`z-[100]`) for its dropdown content when used inside modals. This ensures the dropdown options reliably appear above the dialog.

### File to Modify
`src/components/ui/inline-edit-select.tsx`

### Changes

**Line 97** - Status badge dropdown (used in table views):
```tsx
// Change from:
className={cn("bg-background border border-border shadow-lg z-50", fixedWidth)}
// To:
className={cn("bg-background border border-border shadow-lg z-[100]", fixedWidth)}
```

**Line 148** - Regular dropdown (used in forms/modals):
```tsx
// Change from:
<DropdownMenuContent align="start" className="min-w-[120px] max-h-60 overflow-y-auto bg-popover border z-50">
// To:
<DropdownMenuContent align="start" className="min-w-[120px] max-h-60 overflow-y-auto bg-popover border z-[100]">
```

## Why This Works
- Dialogs use `z-50` (z-index: 50)
- By using `z-[100]` for dropdowns, we guarantee they appear above the dialog overlay
- Since Radix dropdowns render in a portal at the body level, the higher z-index ensures visibility regardless of the dialog's stacking context

## Expected Result
After this change, when users click on the "Likely to Apply" dropdown in the pipeline validation modal, the options (High, Medium, Low) will immediately be visible on top of the modal - no need to click elsewhere first.
