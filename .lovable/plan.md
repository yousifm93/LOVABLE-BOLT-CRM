
# Plan: CRM Update Suggestions - Active Pipeline Filter, Date Formatting & CD Logic Fixes

## Overview
Fix four issues with the CRM Update Suggestions feature:
1. Only generate suggestions for Active pipeline leads
2. Format dates/times in human-readable format (e.g., "Wednesday, January 28, 2026, 10:30 AM EST")
3. Fix timezone handling so times don't shift when approved
4. Tighten CD status logic to require explicit verbiage

---

## Issue 1: Active Pipeline Filter

### Current Behavior
- Email field suggestions are generated for ANY lead that matches an inbound email
- Non-Active leads (Screening, Pre-Qualified, etc.) get suggestions that clutter the modal

### Solution
Add a pipeline stage check in `inbound-email-webhook/index.ts` before calling the field update parser.

### File: `supabase/functions/inbound-email-webhook/index.ts`

**Changes at line ~750:**
```typescript
// Fetch current lead data for context - include pipeline_stage_id to filter
const { data: leadData } = await supabase
  .from('leads')
  .select('pipeline_stage_id, loan_status, appraisal_status, ...')
  .eq('id', leadId)
  .single();

// ONLY generate suggestions for Active pipeline leads
const ACTIVE_PIPELINE_ID = '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
if (!leadData || leadData.pipeline_stage_id !== ACTIVE_PIPELINE_ID) {
  console.log('[Inbound Email Webhook] Skipping field suggestions - lead not in Active pipeline');
} else {
  // ... existing field update logic
}
```

---

## Issue 2: Human-Readable Date/Time Formatting

### Current Behavior
- Dates display as ISO strings: `2026-01-19T11:30:00` → `2026-01-28T10:30:00`
- Confusing and hard to read

### Solution
Update the modal to format datetime values in a friendly format.

### File: `src/components/modals/EmailFieldSuggestionsModal.tsx`

**Add helper function:**
```typescript
// Format datetime for display (e.g., "Wednesday, January 28, 2026, 10:30 AM EST")
const formatAppraisalDateTime = (value: string | null): string => {
  if (!value) return 'Empty';
  
  // If it looks like an ISO datetime
  if (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        });
      }
    } catch {
      // Fall through to return raw value
    }
  }
  return value;
};
```

**Update the display logic (around line 169-174):**
```typescript
// Check if this is a datetime field
const isDateTimeField = suggestion.field_name === 'appr_date_time';

<span className="text-muted-foreground truncate max-w-[150px]">
  {isDateTimeField 
    ? formatAppraisalDateTime(suggestion.current_value)
    : (suggestion.current_value || 'Empty')}
</span>
<ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
<span className="font-medium text-primary truncate max-w-[200px]">
  {isDateTimeField 
    ? formatAppraisalDateTime(suggestion.suggested_value)
    : suggestion.suggested_value}
</span>
```

---

## Issue 3: Timezone Fix for Appraisal Date/Time

### Current Behavior
- When a datetime like `2026-01-28T10:30:00` is approved, it gets saved incorrectly
- The time shifts (e.g., 10:30 AM EST becomes 5:00 AM because it's interpreted as UTC)

### Solution
Update the approval logic in `useEmailSuggestions.tsx` to handle datetime fields specially - preserve the time as-is without timezone conversion.

### File: `src/hooks/useEmailSuggestions.tsx`

**Update `approveSuggestion` function (around line 110):**
```typescript
let actualValue = suggestion.suggested_value;

// Handle datetime fields - ensure time is stored correctly without UTC shift
// If this is a datetime field and value doesn't have timezone, treat as local Eastern time
if (suggestion.field_name === 'appr_date_time') {
  // Store the value as-is (the AI already parsed it to ISO format)
  // The database column is timestamptz, so we need to indicate the timezone
  // If no timezone in the value, append Eastern timezone offset
  if (!actualValue.includes('+') && !actualValue.includes('Z') && !actualValue.includes('-', 10)) {
    // Append Eastern timezone (EST = -05:00, but during daylight saving EDT = -04:00)
    // For simplicity, assume EST (-05:00) 
    actualValue = actualValue + '-05:00';
  }
  console.log(`[useEmailSuggestions] Datetime field adjusted to: ${actualValue}`);
}
```

---

## Issue 4: Stricter CD Status Logic

### Current Behavior
- AI is suggesting CD status → "Requested" based on vague email context
- Example: "We are missing these conditions" incorrectly triggers CD status change

### Solution
Update the AI system prompt in `parse-email-field-updates/index.ts` to require explicit verbiage for CD status changes.

### File: `supabase/functions/parse-email-field-updates/index.ts`

**Add new rule in the system prompt (around line 308):**
```text
17. **CD STATUS - EXPLICIT VERBIAGE REQUIRED**:
    - **cd_status → "Requested"**: ONLY suggest this if the email explicitly contains phrases like:
      - "Please prepare the initial closing disclosure"
      - "CD has been requested"
      - "Need the closing disclosure"
      - "Requesting initial CD"
      - "Please send CD"
    - Do NOT suggest "Requested" based on:
      - "Missing conditions" emails (these are about underwriting conditions, not CD)
      - General status update emails
      - Lock confirmation emails (unless they explicitly request a CD)
    - **cd_status → "Sent"**: Only if email explicitly says "CD sent", "Closing Disclosure has been sent"
    - **cd_status → "Signed"**: Only if email explicitly says "CD signed", "Closing Disclosure signed"
    - When in doubt, do NOT suggest cd_status changes
```

---

## Issue 5: Reprocess Pending Suggestions

### Approach
After the above fixes are deployed, we have two options:

**Option A (Recommended)**: Delete/deny the current pending suggestions that don't meet criteria
- Query `email_field_suggestions` for pending entries where the lead is not in Active pipeline
- Bulk deny those suggestions with notes "Auto-denied: Lead not in Active pipeline"

**Option B**: Clean up via SQL
After deployment, run a cleanup query:
```sql
UPDATE email_field_suggestions 
SET status = 'denied', 
    notes = 'Auto-denied: Lead not in Active pipeline',
    reviewed_at = NOW()
WHERE status = 'pending' 
AND lead_id NOT IN (
  SELECT id FROM leads 
  WHERE pipeline_stage_id = '76eb2e82-e1d9-4f2d-a57d-2120a25696db'
);
```

For the CD status suggestions that were created with weak reasoning, we'll leave those for manual review since the new logic only affects future suggestions.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/inbound-email-webhook/index.ts` | Add Active pipeline filter before generating suggestions |
| `supabase/functions/parse-email-field-updates/index.ts` | Add stricter CD status verbiage requirement to AI prompt |
| `src/components/modals/EmailFieldSuggestionsModal.tsx` | Add datetime formatting helper, format appr_date_time values nicely |
| `src/hooks/useEmailSuggestions.tsx` | Fix timezone handling for datetime field approvals |

---

## Technical Details

### Active Pipeline Stage ID
The Active pipeline stage has ID: `76eb2e82-e1d9-4f2d-a57d-2120a25696db`

### Datetime Format Examples
- **Before**: `2026-01-28T10:30:00`
- **After**: `Wednesday, January 28, 2026, 10:30 AM EST`

### Timezone Handling
- AI parses times as local Eastern time
- When storing to database, we'll append `-05:00` (EST) to preserve the intended time
- This ensures 10:30 AM in the email becomes 10:30 AM in the CRM

---

## Expected Outcome

1. **Active Pipeline Only**: Only leads currently in the Active pipeline will generate CRM update suggestions
2. **Readable Dates**: Appraisal date/times display as "Wednesday, January 28, 2026, 10:30 AM EST"
3. **Correct Times**: When approved, the time will be saved correctly (10:30 AM stays 10:30 AM)
4. **Stricter CD Logic**: CD status will only be suggested with explicit verbiage like "please prepare the CD"
5. **Clean Suggestions**: After cleanup, only valid Active pipeline suggestions remain

---

## After Implementation

Once deployed, the current 7 pending suggestions will be re-evaluated:
- Jackeline Londono appraisal date/time: Will display nicely and save correctly when approved
- Cullen Mahoney appraisal value: No change needed (currency field)
- Cullen Mahoney CD status: Should be manually denied since the reasoning was weak ("missing conditions" ≠ CD requested)
- Rakesh Lakkimsetty appraisal date/time: Will display nicely

The Claudia Schumann suggestion (from a non-Active lead) will no longer appear because of the pipeline filter on future emails.
