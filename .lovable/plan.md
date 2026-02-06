
# Pipeline Review History Order + Move Sections to Left Column

## Changes (all in `src/components/ClientDetailDrawer.tsx`)

### 1. Reverse Pipeline Review History content (most recent first)

In the Pipeline Review History dialog (lines ~2629-2637), after splitting `latest_file_updates` by timestamp regex, reverse the order of the parsed entries so the most recent date appears at the top. This involves:
- Splitting the text into entries by timestamp boundaries
- Reversing the array of entries
- Then applying the existing highlight logic to each entry

### 2. Move "About the Borrower" from right column to left column

Remove the "About the Borrower" section from the right column (lines ~2713-2775) and place it in the left column after "Chat with Borrower" (after line ~2525), keeping it collapsed by default for the active stage with the same collapsible pattern.

### 3. Move "Stage History" from right column to left column

Remove the "Stage History" section from the right column (lines ~2885-2960+) and place it in the left column after the newly moved "About the Borrower" section, keeping the same collapsible behavior for screening/pre-qualified/pre-approved/active stages.

### Left column order after changes (active stage):
1. Live Deal
2. Third Party Items
3. Chat with Borrower (collapsed)
4. About the Borrower (collapsed) -- moved here
5. Stage History (collapsed) -- moved here

### Right column order after changes (active stage):
1. Pipeline Review (mic button)
2. Tasks
3. DTI, Address and PITI (collapsed)
4. Latest File Update
5. Quick Actions (collapsed)
