

# Pipeline Review Date Highlighting + Move DTI Section

## Changes (all in `src/components/ClientDetailDrawer.tsx`)

### 1. Highlight dates in Pipeline Review History dialog

Replace the plain text rendering in the history dialog (line ~2636-2637) with a function that parses the content and renders timestamp patterns like `[01/09/26 9:25 AM]` with bold, underlined, and highlighted styling. This will use a regex split to identify timestamps and wrap them in styled `<span>` elements with `font-bold underline bg-yellow-100` classes.

### 2. Move DTI, Address and PITI from left column to right column (above About the Borrower)

- Remove the active-stage DTI block from the left column (lines ~2476-2483)
- Add the same `LeadTeamContactsDatesCard` component in the right column, positioned between Tasks and About the Borrower (before line ~2700), wrapped in a collapsible with `defaultOpen={false}` to match the active stage pattern

### Right column order after changes (active stage):
1. Pipeline Review (mic button)
2. Tasks
3. DTI, Address and PITI (moved here, collapsed by default)
4. About the Borrower (collapsed by default)
5. Latest File Update
6. Quick Actions (collapsed)
7. Stage History (collapsed)

