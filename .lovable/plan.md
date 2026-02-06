

# Layout Reorganization + DTI Expanded by Default

## Changes (all in `src/components/ClientDetailDrawer.tsx`)

### 1. DTI, Address and PITI expanded by default (Active stage)

Change `defaultCollapsed={true}` to `defaultCollapsed={false}` for the Active/Past Client DTI section (around line 3003).

### 2. Move "Latest File Update" to left column (under Third Party Items)

Remove the Latest File Update section from the right column (lines ~3010-3081) and place it in the left column after the Third Party Items card (after line ~2474), for the active stage.

### 3. Move Chat with Borrower, About the Borrower, and Stage History to right column (under Quick Actions)

Remove these three sections from the left column (lines ~2478-2812) for active/past-client stage and add them to the right column after Quick Actions (after line ~3116), keeping their existing collapsible behavior (all collapsed by default for active stage).

### Left column order after changes (active stage):
1. Live Deal
2. Third Party Items
3. Latest File Update (moved here)

### Right column order after changes (active stage):
1. Pipeline Review (mic button)
2. Tasks
3. DTI, Address and PITI (expanded by default)
4. Quick Actions (collapsed)
5. Chat with Borrower (collapsed) -- moved here
6. About the Borrower (collapsed) -- moved here
7. Stage History (collapsed) -- moved here

