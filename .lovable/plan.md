
Goal: Make the “Import Conditions from Initial Approval” modal reliably scroll vertically (mouse wheel/trackpad + scrollbar drag) so users can reach all parsed conditions.

What I found (current code)
- The modal is `InitialApprovalConditionsModal.tsx`.
- The conditions list is wrapped in a Radix `ScrollArea`.
- The modal content uses `max-h-[90vh]` but does not set an explicit height. In many layouts, a child `ScrollArea` with `h-full`/`flex-1` won’t actually become scrollable unless an ancestor has a concrete height (not just max-height). This commonly results in “it looks like it should scroll, but the wheel does nothing”.
- Additionally, `DialogContent`’s base component class includes `grid ...` and we add `flex flex-col`. Tailwind’s “last class wins” usually handles this, but depending on class ordering and runtime merging, it’s safer to explicitly force the display mode to avoid layout edge cases that can break the flex sizing required for scrolling.

Likely root cause
- The scroll container (ScrollArea Root/Viewport) is not receiving a determinable height because the dialog is only constrained by max-height. Without a determinable height, the viewport grows to fit content instead of scrolling.
- The list area also uses a manual `style={{ maxHeight: 'calc(90vh - 280px)' }}` which is brittle across screen sizes; if the calculation is off or the dialog’s actual rendered height differs, it can prevent proper scrolling behavior.

Implementation plan (code changes)
1) Force the modal to have a real height and a clear flex layout
   - File: `src/components/modals/InitialApprovalConditionsModal.tsx`
   - Update `<DialogContent ...>` to:
     - Force flex display (override any grid) using `!flex !flex-col`
     - Set an explicit height, e.g. `h-[90vh]` (keep `max-w-6xl`)
     - Keep `overflow-hidden` so only the ScrollArea scrolls
   - Example target class (conceptually):
     - `className="max-w-6xl h-[90vh] !flex !flex-col overflow-hidden"`

2) Make header + controls + footer “non-scrolling” and the list area “the only scroll region”
   - Still in `InitialApprovalConditionsModal.tsx`:
     - Add `shrink-0` to:
       - `DialogHeader`
       - Loan summary block (if present)
       - Selection controls block
       - `DialogFooter`
     - Ensure the scroll region is `flex-1 min-h-0` so it can shrink and actually scroll.

3) Fix the ScrollArea sizing (remove brittle maxHeight math)
   - Replace the current ScrollArea usage:
     - Current:
       - `className="flex-1 min-h-0 -mx-6 px-6" style={{ maxHeight: 'calc(90vh - 280px)' }}`
     - Change to:
       - `className="flex-1 min-h-0 -mx-6 px-6"`
     - Let the parent’s fixed height (`h-[90vh]`) and flex layout determine the available space.

4) Ensure wheel/trackpad scroll is captured by the ScrollArea viewport
   - In many Radix ScrollArea setups, this “just works” once height is correct.
   - If it still fails after steps 1–3, add a small compatibility tweak:
     - Add `onWheelCapture={(e) => e.stopPropagation()}` on the ScrollArea Root to prevent the dialog overlay/content from intercepting wheel events.
     - This is only applied if needed after testing.

5) Quick verification checklist (manual)
   - Open modal with 20+ conditions.
   - Scroll with:
     - trackpad two-finger scroll
     - mouse wheel
     - dragging the scrollbar thumb
   - Confirm footer buttons remain visible while list scrolls.
   - Confirm focus in Inputs/Selects does not “freeze” the scroll area.

Files to touch
- `src/components/modals/InitialApprovalConditionsModal.tsx` (primary)

Expected outcome
- The conditions list scrolls consistently on all screens, while the header/controls/footer remain fixed and visible.

Notes / edge cases to watch
- If the user is on a very short viewport (small laptop or browser zoom), consider switching to `h-[85vh]` or `h-[min(90vh,900px)]` style so it doesn’t feel too tall on large screens. We can tune after we confirm scrolling works.
