
## Fix Plan: Three CRM Issues

Based on my investigation, I've identified the root causes for all three issues and have a detailed fix plan.

---

### Issue 1: Idle On Dates Not Populated

**Root Cause**: The `idle_moved_at` column and trigger were just created. The trigger only fires on UPDATE when a lead moves to the Idle stage. Existing leads that are already in Idle don't have this timestamp because they were moved before the trigger existed.

**Solution**: Run a one-time data backfill to populate `idle_moved_at` for existing idle leads, using a reasonable default (either their `updated_at` timestamp or the current time).

**Database Update**:
```sql
UPDATE leads 
SET idle_moved_at = COALESCE(updated_at, NOW())
WHERE pipeline_stage_id = '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a'
  AND idle_moved_at IS NULL;
```

Going forward, the trigger will automatically set this timestamp when leads are moved to Idle.

---

### Issue 2: @Mentions Not Showing Autocomplete

**Root Cause**: The `MentionableRichTextEditor` component has a bug in its mention detection logic. When using TipTap, the value is HTML (e.g., `<p>@sal</p>`). The current logic:

1. Uses `lastIndexOf('@')` on the HTML string
2. Gets `afterAt` as everything after `@` (includes closing tags like `</p>`)
3. Checks for space using `afterAt.indexOf(' ')` on the raw HTML string (not cleaned text)
4. The combination causes the popover trigger logic to fail

**Solution**: Fix the mention detection to properly parse the HTML and extract the text after `@`:

```typescript
// Current broken logic:
const afterAt = newValue.substring(lastAtIndex + 1);
const spaceIndex = afterAt.indexOf(' ');

// Fixed logic - clean HTML first, then check for mention pattern:
const plainText = newValue.replace(/<[^>]*>/g, '');
const lastAtIndex = plainText.lastIndexOf('@');
if (lastAtIndex !== -1) {
  const afterAt = plainText.substring(lastAtIndex + 1);
  // Now afterAt is clean text like "sal" instead of "sal</p>"
}
```

**Files to Modify**:
- `src/components/ui/mentionable-rich-text-editor.tsx`

---

### Issue 3: Past Clients Columns Not Visible

**Root Cause**: The columns (`fcp_file`, `appraisal_file`, `client_rating`) were added to the column definitions, BUT they are not included in `MAIN_VIEW_COLUMNS` (lines 215-229). The page has logic that forces Main View defaults on load, hiding any columns not in that list.

**Current MAIN_VIEW_COLUMNS**:
```typescript
const MAIN_VIEW_COLUMNS = [
  "borrower_name", "lender", "loan_amount", "close_date", "loan_status",
  "interest_rate", "subject_address_1", "subject_address_2", "subject_city",
  "subject_state", "subject_zip", "buyer_agent", "listing_agent"
];
```

**Solution**: Add the three new columns to `MAIN_VIEW_COLUMNS` so they appear by default:

```typescript
const MAIN_VIEW_COLUMNS = [
  "borrower_name", "lender", "loan_amount", "close_date", "loan_status",
  "interest_rate", "subject_address_1", "subject_address_2", "subject_city",
  "subject_state", "subject_zip", "buyer_agent", "listing_agent",
  "fcp_file", "appraisal_file", "client_rating"  // Added
];
```

Also add column widths:
```typescript
const COLUMN_WIDTHS: Record<string, number> = {
  // ... existing widths ...
  fcp_file: 80,
  appraisal_file: 80,
  client_rating: 60,
};
```

**Files to Modify**:
- `src/pages/PastClients.tsx`

---

### Summary of Changes

| Issue | File(s) | Change Type |
|-------|---------|-------------|
| Idle On dates | Database | One-time UPDATE query to backfill existing data |
| @Mentions autocomplete | `mentionable-rich-text-editor.tsx` | Fix HTML parsing logic for mention detection |
| Past Clients columns | `PastClients.tsx` | Add columns to MAIN_VIEW_COLUMNS array and COLUMN_WIDTHS |

---

### Technical Details

**@Mentions Fix - Detailed Approach**:

The current mention detection parses HTML strings directly, which breaks when TipTap wraps content in tags. The fix will:

1. Strip HTML tags to get plain text for @ detection
2. Track cursor position relative to plain text (not HTML)
3. Properly identify when user is typing after @ symbol
4. Show popover with filtered team members

**Alternative Consideration**: TipTap has a native Mention extension that handles this properly. However, implementing that would require more extensive changes. The simpler fix is to correct the HTML parsing logic, which maintains the current architecture.
