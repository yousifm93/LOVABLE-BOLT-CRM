

# Active Stage: Align Latest File Update and Collapse About the Borrower

## Overview
Three changes to make the active stage layout consistent with screening/pre-qualified/pre-approved.

## Changes (all in `src/components/ClientDetailDrawer.tsx`)

### 1. Remove the Active-only "Latest File Update" from the center column
The center column (lines ~2593-2632) has an active-only "Latest File Update" section that uses `MentionableInlineEditNotes` with a gray background. This will be deleted entirely.

### 2. Add "active" to the right-column Latest File Update
The right-column "Latest File Update" block (lines ~2770-2841) currently only shows for `['screening', 'pre-qualified', 'pre-approved']`. Add `'active'` to that array so the active stage uses the same Textarea-based Latest File Update section as the other stages.

### 3. Make "About the Borrower" collapsed by default for active stage
The "About the Borrower" section in the right column (lines ~2713-2768) currently renders as a plain Card for active/past-clients. Wrap it in a `Collapsible` component with `defaultOpen={false}`, using the same collapsible header pattern (ChevronRight icon with rotation) used elsewhere in the drawer.

## Result
- Active stage right column order: Tasks, About the Borrower (collapsed), Latest File Update (matching other stages), Quick Actions (collapsed), Stage History (collapsed)
- The gray-background `MentionableInlineEditNotes` version of Latest File Update is removed from center column
- All early stages now share the same Latest File Update component in the right column
