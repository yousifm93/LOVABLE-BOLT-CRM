

# Fix: Static Tasks Box (5 Rows) and Align Three Column Heights in Leads Stage

## 1. Tasks Box: Fixed Height for Exactly 5 Tasks

The Tasks card currently uses `max-h-[280px]` with variable content. Change it to a fixed height that always fits exactly 5 task rows (regardless of how many tasks exist), with scrolling for overflow.

Each task row is approximately 44px tall (title line + due date line + spacing). Five rows = ~220px of content. Adding card header (~40px) and padding, the CardContent area should be fixed at `h-[220px]` (not max-h, but fixed h) so it always reserves space for 5 tasks even when there are fewer.

**Change in `ClientDetailDrawer.tsx` at line 2794:**
- From: `max-h-[280px] overflow-y-auto`
- To: `h-[220px] overflow-y-auto`

This ensures:
- Fewer than 5 tasks: empty space preserved, box stays same size
- Exactly 5 tasks: fills the box perfectly
- More than 5 tasks: scroll to see the rest

## 2. Align the Three Top Sections in Leads Stage

Currently in the Leads stage, the three columns have different bottom edges:
- **Left**: ContactInfoCard (variable height based on fields)
- **Middle**: Status Tracker card fixed at `h-[360px]`
- **Right**: SendEmailTemplatesCard (variable height)

The middle column card is the anchor at `h-[360px]`. To align all three columns' first sections:

- **Middle column card**: Already `h-[360px]` -- this is the reference height
- **Left column (ContactInfoCard)**: Needs a matching fixed height. Currently it's auto-sized. Will not change ContactInfoCard itself but instead wrap the "top section" area to match.
- **Right column (SendEmailTemplatesCard)**: Same treatment.

The approach: Since the three-column grid is `grid-cols-[1fr_2fr_1fr]`, the simplest way to align is to give the middle card's `h-[360px]` as the target, and make the ContactInfoCard and SendEmailTemplatesCard stretch to match using CSS. Specifically, the left and right columns' first cards will use `min-h-[360px]` to ensure they extend to at least the same height as the middle section.

**Changes:**
1. ContactInfoCard wrapper (left column, first card for Leads/Pending App): Add `min-h-[360px]` to the ContactInfoCard's outer element
2. SendEmailTemplatesCard wrapper (right column): Wrap in a div with `min-h-[360px]` or pass a className prop

Since ContactInfoCard and SendEmailTemplatesCard are separate components, the simplest approach is to wrap them in the drawer:
- Wrap ContactInfoCard in `<div className="min-h-[360px]">` for Leads stage
- Wrap SendEmailTemplatesCard in `<div className="min-h-[360px]">` for Leads stage

## Technical Details

| Location | Line | Change |
|----------|------|--------|
| Tasks CardContent | ~2794 | `max-h-[280px]` to `h-[220px]` (fixed height for 5 tasks) |
| ContactInfoCard wrapper | ~2063 | Wrap in `min-h-[360px]` div for leads/pending-app alignment |
| SendEmailTemplatesCard wrapper | ~2659 | Wrap in `min-h-[360px]` div for leads/pending-app stage |

**File modified**: `src/components/ClientDetailDrawer.tsx` (3 locations)

