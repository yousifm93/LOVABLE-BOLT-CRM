

## Fix: Contact Auto-Add System Issues

### Issue 1: Team Emails Being Added

**Problem**: Contacts with `@mortgagebolt.com` domain (Ashley, Yousif) are being extracted as contacts when they are team members.

**Solution**: Add domain exclusion logic to `parse-email-contacts` function to skip any email addresses ending with `@mortgagebolt.com`.

**Implementation**:
```typescript
// Add after email validation (around line 257)
const excludedDomains = ['mortgagebolt.com', 'mortgagebolt.org'];
const emailDomain = contact.email.split('@')[1]?.toLowerCase();
if (emailDomain && excludedDomains.includes(emailDomain)) {
  console.log(`Skipping team email: ${contact.email}`);
  continue;
}
```

Also clean up existing pending contacts with team domains:
```sql
DELETE FROM contacts 
WHERE email LIKE '%@mortgagebolt.com' 
  AND approval_status = 'pending';
```

---

### Issue 2: Backfill Timeout

**Problem**: The `backfill-email-contacts` function processes emails sequentially with AI calls that take 5-10 seconds each. Processing 99 emails would take 10-15 minutes, but edge functions timeout after 60 seconds.

**Solution**: Change the backfill approach:
1. Increase delay between calls to 500ms (less rate limiting pressure)
2. Process in batches by running the function multiple times with different time windows
3. Or accept partial progress and re-run for remaining emails

**Current Status**: 
- Processed: 22/99 emails
- Found: ~10 contacts so far
- Remaining: 77 emails still need processing

**Action**: Re-run the backfill to continue processing remaining emails. Can run multiple times to process in chunks.

---

### Issue 3: "New Contacts" Tab Empty

**Problem**: The Email page's "New Contacts" filter queries `email_contact_suggestions` for `status = 'pending'`, but the parse function now saves suggestions with `status = 'auto_added'` since contacts go directly into the `contacts` table.

**Solution**: Change the "New Contacts" view to look at the `contacts` table instead of `email_contact_suggestions`. Show emails that have associated contacts with `approval_status = 'pending'`.

**Implementation in Email.tsx**:
1. Create a new map: `emailsWithPendingContacts` that stores `email_log_id → count`
2. Query from `contacts` table where `approval_status = 'pending'` and group by `email_log_id`
3. Update the "New Contacts" filter to use this new map

```typescript
// Replace contactSuggestionsCount query with:
const { data: pendingContacts } = await supabase
  .from('contacts')
  .select('email_log_id')
  .eq('approval_status', 'pending')
  .not('email_log_id', 'is', null);

const contactCountsMap = new Map<string, number>();
for (const c of pendingContacts || []) {
  if (c.email_log_id) {
    contactCountsMap.set(c.email_log_id, (contactCountsMap.get(c.email_log_id) || 0) + 1);
  }
}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/parse-email-contacts/index.ts` | Add `@mortgagebolt.com` domain exclusion |
| `src/pages/Email.tsx` | Fix "New Contacts" query to use `contacts` table |

### Database Cleanup

Delete team emails that were incorrectly added:
- `yousif@mortgagebolt.com`
- Any other `@mortgagebolt.com` addresses

### Follow-up Action

After implementing fixes, re-run the backfill for remaining 77 emails by calling:
```bash
POST /functions/v1/backfill-email-contacts
{ "hoursBack": 24 }
```

The function will skip emails that already have suggestions (via the existing check).

