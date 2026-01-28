
# Plan: Fix Five CRM Bugs

## Overview
This plan addresses five distinct bugs affecting appraisal workflows, dashboard data display, and activity date logging.

---

## Bug Summary

| Bug | Root Cause | Status |
|-----|-----------|--------|
| 1. Appraisal order date not auto-populating | No frontend logic to set date when status = "Ordered" | Identified |
| 2. Upload appraisal task not created | Trigger function has wrong `trigger_type` AND wrong column name | Identified |
| 3. "About the Borrower" missing in applications | `notes` field not selected in application queries | Identified |
| 4. Face-to-face meeting wrong date | Already fixed with T12:00:00 pattern - may need data fix | Needs verification |
| 5. Appraisal PDF not parsing | No logs found - may be edge function invocation issue | Needs debugging |

---

## Bug 1: Appraisal Order Date Not Populating

**Problem:** When appraisal status is changed to "Ordered", the appraisal_ordered_date is not automatically set.

**File:** `src/components/lead-details/AppraisalTab.tsx`

**Solution:** Add logic to auto-set the ordered date when status changes to "Ordered":

```typescript
// In the InlineEditSelect onValueChange handler (line 139)
onValueChange={(value) => {
  onUpdate('appraisal_status', value);
  // Auto-set ordered date when status changes to Ordered
  if (value === 'Ordered' && !data.appraisal_ordered_date) {
    onUpdate('appraisal_ordered_date', new Date().toISOString().split('T')[0]);
  }
}}
```

---

## Bug 2: Upload Appraisal Task Not Created

**Problem:** The database trigger function has TWO issues:
1. Looking for `trigger_type = 'appraisal_status_change'` but automations have `trigger_type = 'status_changed'`
2. Using `lead_id` column which doesn't exist - should be `borrower_id`

**Fix:** SQL migration to update the trigger function:

```sql
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    -- Get user ID from JWT
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'  -- FIXED: was 'appraisal_status_change'
        AND ta.trigger_config->>'field' = 'appraisal_status'
        AND ta.trigger_config->>'target_status' = NEW.appraisal_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,  -- FIXED: was 'lead_id'
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'Open',
        v_user_id,
        automation.id
      );

      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_created,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        true,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
```

---

## Bug 3: "About the Borrower" Missing in Applications List

**Problem:** The application queries in `useDashboardData.tsx` don't include the `notes` field.

**File:** `src/hooks/useDashboardData.tsx`

**Solution:** Add `notes` to ALL application query select statements:

**Lines 228, 248, 268, 288, 308, 328** - Add `notes` to each select:

```typescript
// Change from:
.select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')

// Change to:
.select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
```

This needs to be done for 6 queries:
- `thisMonthApps` (line 228)
- `yesterdayApps` (line 248)
- `todayApps` (line 268)
- `lastWeekApps` (line 288)
- `thisWeekApps` (line 308)
- `allApplications` (line 328)

---

## Bug 4: Face-to-Face Meeting Wrong Date

**Current State:** The memory says this was already fixed with the T12:00:00 pattern.

**Files checked:**
- `AgentMeetingLogModal.tsx` line 64 & 74: Uses `new Date(meetingDate + 'T12:00:00').toISOString()` ✓
- `QuickAddActivityModal.tsx` line 224: Uses `new Date(activityDate.split('T')[0] + 'T12:00:00').toISOString()` ✓

**Hypothesis:** The Ben Gonzalez meeting showing Jan 26 instead of Jan 27 may be from old data before the fix was applied.

**Action:** No code change needed - the fix is already in place. The existing record may have been created before the fix.

---

## Bug 5: Appraisal PDF Not Parsing

**Problem:** No logs found for `parse-appraisal` edge function.

**Possible causes:**
1. Edge function not being called
2. Error before logging starts
3. Function not deployed

**Debugging steps needed:**
1. Check if signed URL generation succeeds
2. Check if function invocation happens
3. Add more detailed error logging

**File:** `src/components/lead-details/AppraisalTab.tsx`

**Enhancement:** Add better error handling and logging:

```typescript
// Around line 88-98, enhance error handling
const { data: signedUrlData, error: signedUrlError } = await supabase.storage
  .from('documents')
  .createSignedUrl(storagePath, 300);

if (signedUrlError) {
  console.error('[AppraisalTab] Failed to create signed URL:', signedUrlError);
  throw signedUrlError;
}

console.log('[AppraisalTab] Calling parse-appraisal with URL length:', signedUrlData.signedUrl.length);

const { data: functionData, error: functionError } = await supabase.functions.invoke('parse-appraisal', {
  body: { file_url: signedUrlData.signedUrl }
});

console.log('[AppraisalTab] parse-appraisal response:', { functionData, functionError });
```

---

## Implementation Order

1. **Bug 3** (Quick fix) - Add `notes` to application queries
2. **Bug 1** (Quick fix) - Add auto-set ordered date logic
3. **Bug 2** (DB migration) - Fix trigger function
4. **Bug 5** (Debug) - Add logging to identify parsing issue
5. **Bug 4** (Verify) - Confirm fix is working for new entries

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useDashboardData.tsx` | Add `notes` to 6 application queries |
| `src/components/lead-details/AppraisalTab.tsx` | Auto-set ordered date + enhanced logging |
| New migration file | Fix trigger function column and type matching |

---

## Technical Notes

- The appraisal status trigger needs to match on `trigger_config->>'field' = 'appraisal_status'` in addition to the target status
- The tasks table uses `borrower_id` to reference leads, not `lead_id`
- Date timezone handling uses T12:00:00 pattern to prevent day-shift issues
