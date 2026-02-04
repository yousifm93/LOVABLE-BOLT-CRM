
# Plan: Fix CRM Task Automation, Email Tracking & UI Issues

## Problems Identified

### 1. CTC Status Error: `column "trigger_data" does not exist`
**Root Cause:** The trigger function `execute_loan_status_changed_automations` is trying to insert into a `trigger_data` column in `task_automation_executions`, but this column doesn't exist. The actual columns are:
- `id`, `automation_id`, `lead_id`, `task_id`, `executed_at`, `success`, `error_message`

**Fix:** Remove the `trigger_data` column from the INSERT statement in the trigger function.

### 2. Email Activity Section Position
**Current:** The "Email Activity" section exists but is placed AFTER the Files section.
**Required:** Should be placed BETWEEN "EPO Period" and "Files" section, and renamed to "Scenario Emails".

### 3. Email Open/Reply Tracking Not Working
**Problem:** When emails are opened or replied to in the actual email inbox (scenarios@mortgagebolt.org), the `lenders` table columns (`last_email_opened`, `last_email_replied`) are not being updated.

**Root Cause:** The current architecture:
1. Bulk emails are sent from `scenarios@mortgagebolt.org` via the IONOS SMTP server
2. Replies come into `scenarios@mortgagebolt.org` inbox
3. The `fetch-emails-imap` function fetches emails from this inbox to display in the Email tab
4. The `inbound-email-webhook` processes inbound emails via SendGrid

**Missing Link:** Nothing is currently linking inbound emails TO the lenders table to update `last_email_opened` or `last_email_replied`.

**Solution Approach:**
1. Update the `fetch-emails-imap` function to detect when an email from a lender domain is a reply to a scenario email
2. When a reply is detected, update the corresponding lender's `last_email_replied` and `last_email_reply_content`
3. For email open tracking, this would require adding tracking pixels to outbound emails (more complex - Phase 2)

For immediate implementation, we'll:
- Add a background job that scans the `email_logs` table for emails FROM lender domains TO scenarios@mortgagebolt.org
- Match these emails to lenders by domain/email
- Update the lender's `last_email_replied` status

---

## Implementation Details

### Database Migration
Fix the trigger function to remove the non-existent `trigger_data` column:

```sql
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  ...
BEGIN
  ...
  -- Log execution (removed trigger_data column)
  INSERT INTO task_automation_executions (
    automation_id,
    lead_id,
    task_id,
    success,
    executed_at
  ) VALUES (
    automation_record.id,
    NEW.id,
    new_task_id,
    true,
    NOW()
  );
  ...
END;
$$ LANGUAGE plpgsql;
```

### LenderDetailDialog.tsx Changes
1. Move the Email Activity section from after Files to between EPO Period and Files
2. Rename "Email Activity" to "Scenario Emails"

### Lender Email Reply Detection
Create background logic to:
1. Query `email_logs` for emails TO scenarios@mortgagebolt.org
2. Match sender domains to lenders' `account_executive_email` domains
3. Update lender records with `last_email_replied = true` and `last_email_reply_content`

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration | Fix trigger function - remove `trigger_data` column from INSERT |
| `src/components/LenderDetailDialog.tsx` | Move & rename Email Activity section |
| `src/components/modals/BulkLenderEmailModal.tsx` | Add email logging with lender_id reference |
| New edge function or scheduled job | Detect lender email replies and update tracking |

---

## Technical Implementation

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
...
    -- Log execution - FIXED: removed trigger_data
    INSERT INTO task_automation_executions (
      automation_id,
      lead_id,
      task_id,
      success,
      executed_at
    ) VALUES (
      automation_record.id,
      NEW.id,
      new_task_id,
      true,
      NOW()
    );
...
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### LenderDetailDialog Section Reorder
Current order: EPO → Files → Email Activity → Associated Clients
New order: EPO → **Scenario Emails** → Files → Associated Clients

### Email Reply Detection Logic
When fetching emails for the scenarios inbox, check if:
1. Email is FROM a domain matching a lender's AE email domain
2. Subject contains "Re:" or references a previously sent email subject
3. If match found, update that lender's tracking fields

---

## Expected Results

1. **CTC Status Change**: Will successfully create all 4 CTC tasks without errors
2. **Scenario Emails Section**: Moved between EPO and Files, properly named
3. **Email Reply Tracking**: Lenders who reply will have their `last_email_replied` status updated to "Yes"

---

## Phase 2 (Future Enhancement)
- Add tracking pixel to outbound emails for automatic open detection
- Real-time webhook integration for email open/reply events
- Email threading to show full conversation history in lender detail
