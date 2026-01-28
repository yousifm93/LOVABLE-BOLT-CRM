

# Plan: Clear and Re-Process Lender Marketing Suggestions

## Overview
Create a new edge function to clear all current pending suggestions and re-process the last 48 hours of lender marketing emails through the enhanced `parse-lender-marketing-data` function.

---

## Current State
- **Pending suggestions**: 1,446 records to clear
- **Lender marketing emails (48h)**: 76 emails to re-process

---

## Implementation

### Create New Edge Function: `reprocess-lender-suggestions`

This function will:
1. Delete all pending suggestions from `lender_field_suggestions` 
2. Query `email_logs` for marketing emails from the last 48 hours
3. Call `parse-lender-marketing-data` for each email
4. Return summary of processing results

**File:** `supabase/functions/reprocess-lender-suggestions/index.ts`

```typescript
// Edge function that:
// 1. DELETE FROM lender_field_suggestions WHERE status = 'pending'
// 2. SELECT id, subject, body, html_body, from_email FROM email_logs 
//    WHERE is_lender_marketing = true 
//    AND timestamp >= NOW() - INTERVAL '48 hours'
// 3. For each email, call parse-lender-marketing-data
// 4. Return { cleared: count, reprocessed: count, errors: [] }
```

### Processing Flow

```text
1. Clear Pending Suggestions
   DELETE FROM lender_field_suggestions WHERE status = 'pending'
   ↓
2. Fetch Marketing Emails (48h)
   SELECT * FROM email_logs 
   WHERE is_lender_marketing = true 
   AND timestamp >= NOW() - INTERVAL '48 hours'
   ↓
3. For Each Email (76 total):
   Call parse-lender-marketing-data with:
   - subject
   - body / html_body
   - from_email  
   - emailLogId
   ↓
4. Return Summary
   { cleared: 1446, reprocessed: 76, newSuggestions: X }
```

---

## Technical Details

### Edge Function Implementation

```typescript
serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Step 1: Clear all pending suggestions
  const { count: clearedCount } = await supabase
    .from('lender_field_suggestions')
    .delete()
    .eq('status', 'pending');
  
  // Step 2: Fetch marketing emails from last 48 hours
  const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: emails } = await supabase
    .from('email_logs')
    .select('id, subject, body, html_body, from_email')
    .eq('is_lender_marketing', true)
    .gte('timestamp', cutoffDate);
  
  // Step 3: Process each email
  let processed = 0;
  let errors = [];
  
  for (const email of emails) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/parse-lender-marketing-data`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          subject: email.subject,
          body: email.body,
          htmlBody: email.html_body,
          fromEmail: email.from_email,
          emailLogId: email.id,
        }),
      });
      processed++;
    } catch (e) {
      errors.push({ emailId: email.id, error: e.message });
    }
  }
  
  return new Response(JSON.stringify({
    success: true,
    cleared: clearedCount,
    emailsFound: emails.length,
    processed,
    errors,
  }));
});
```

### Config.toml Entry

```toml
[functions.reprocess-lender-suggestions]
verify_jwt = false
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/reprocess-lender-suggestions/index.ts` | New edge function to clear and re-process |
| Update `supabase/config.toml` | Add function config |

---

## Execution

After deployment, the function will be called to:
1. Clear all 1,446 pending suggestions
2. Re-process all 76 lender marketing emails from the last 48 hours
3. Generate new, improved suggestions using the enhanced AI prompt and validation logic

The new suggestions will include:
- Proper lender identification (no more "Unknown Lender")
- De-duplicated product fields (no duplicate Y values)
- Min/max validation (no backwards changes)
- Complete field extraction from each email

---

## Expected Results

After re-processing:
- Fewer total suggestions (duplicates removed)
- More accurate lender names
- Better field coverage per email
- Proper min/max direction validation

