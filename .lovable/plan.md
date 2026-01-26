

## Plan: Retroactively Process Last 24 Hours of Emails for Contacts

### Summary

Create a new edge function that will scan all 99 emails received in the last 24 hours and run them through the same contact extraction process that will now happen automatically for new emails.

---

### Current State

| Metric | Value |
|--------|-------|
| Emails in last 24 hours | 99 |
| Already processed for contacts | 0 |
| Emails needing processing | 99 |

---

### Implementation

**Create new edge function:** `backfill-email-contacts`

This function will:
1. Query all inbound emails from the last 24 hours
2. For each email, call the existing `parse-email-contacts` function
3. Track progress and report results
4. Handle rate limiting to avoid overwhelming OpenAI API

**Technical Approach:**
```text
+------------------+     +------------------------+     +----------------------+
| backfill-email-  | --> | Fetch last 24h emails  | --> | Loop through emails  |
| contacts         |     | from email_logs        |     | with delay between   |
+------------------+     +------------------------+     +----------------------+
                                                                   |
                                                                   v
                                                        +----------------------+
                                                        | Call parse-email-    |
                                                        | contacts for each    |
                                                        +----------------------+
                                                                   |
                                                                   v
                                                        +----------------------+
                                                        | Return summary of    |
                                                        | contacts found       |
                                                        +----------------------+
```

---

### Edge Function Code Structure

```typescript
// supabase/functions/backfill-email-contacts/index.ts

1. Fetch all inbound emails from last 24 hours
2. Filter out emails that already have contact suggestions
3. For each email:
   - Build emailContent object (from, fromEmail, subject, body, date)
   - Call parse-email-contacts function
   - Add small delay (500ms) between calls to avoid rate limits
   - Track success/failure counts
4. Return summary with:
   - Total emails processed
   - Total contacts extracted
   - Any errors encountered
```

---

### Execution Plan

1. Create the `backfill-email-contacts` edge function
2. Deploy the function
3. Call it once to process all 99 emails
4. New contacts will appear in "Pending Approval" section of Master Contact List

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/backfill-email-contacts/index.ts` | One-time backfill function to process historical emails |

---

### Expected Results

- All 99 emails will be scanned for contact information
- New contacts (that don't already exist in contacts, buyer_agents, lenders, or leads) will be added with `approval_status: 'pending'`
- The "New Contacts" view in Email tab will populate
- The Master Contact List sidebar badge will show pending approval count

