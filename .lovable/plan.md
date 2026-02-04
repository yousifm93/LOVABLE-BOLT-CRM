
# Plan: Fix CRM UI/UX Issues and Task Automation

## Executive Summary

This plan addresses **seven critical issues** affecting the CRM's user experience and core functionality:

1. **Latest File Update UI** - Wrong component being used, needs to match "About the Borrower" style
2. **Pipeline Review Section** - Height overflow issue, needs to match Stage History height
3. **Task Automations Not Firing** - CTC status change tasks not being created
4. **Email Read Status** - Already fixed (not in scope)
5. **Lender Email Tracking** - Need to add timestamp to "Last Email Sent" column  
6. **Lender Email Open/Reply Tracking** - New feature request for tracking engagement
7. **Lender Detail Email Section** - Add comprehensive email history view

---

## Issue 1: Latest File Update UI Mismatch

### **Current Problem**
The "Latest File Update" section in the Active pipeline uses `FileUpdatesDisplay` component which shows a simple read-only box, but the user wants it to function like "About the Borrower" - a clickable, editable text area with metadata footer.

### **Root Cause**
Lines 2797-2825 in `ClientDetailDrawer.tsx` render the Latest File Update section for Active stage using `MentionableInlineEditNotes` (correct), but the **Pipeline Review section** (lines 2828-2886) uses `FileUpdatesDisplay` (wrong component).

### **Solution**
1. Update Pipeline Review section to use `MentionableInlineEditNotes` instead of `FileUpdatesDisplay`
2. Remove the voice recording button from Pipeline Review (it's causing confusion)
3. Ensure both sections have identical styling with metadata footer showing timestamp and user

### **Files to Modify**
- `src/components/ClientDetailDrawer.tsx` (lines 2828-2886)

---

## Issue 2: Pipeline Review Height Constraint

### **Current Problem**
Pipeline Review section can grow indefinitely in height, making it visually inconsistent with Stage History section.

### **Solution**
Add `max-h-[280px]` constraint to Pipeline Review content area to match Stage History section height (line 3034 shows Stage History card structure).

### **Files to Modify**
- `src/components/ClientDetailDrawer.tsx` (Pipeline Review CardContent)

---

## Issue 3: Task Automations Not Creating Tasks (CRITICAL)

### **Root Cause Analysis**

I've confirmed the trigger exists and is active:
```sql
CREATE TRIGGER trigger_loan_status_changed_automations 
AFTER UPDATE OF loan_status ON public.leads 
FOR EACH ROW 
EXECUTE FUNCTION execute_loan_status_changed_automations()
```

Active CTC automations in database:
- "Finalize Closing Package" (trigger: loan_status = CTC)
- "File is CTC - Call Buyer's Agent" (trigger: loan_status = CTC)  
- "File is CTC - Call Borrower" (trigger: loan_status = CTC)
- "File is CTC - Call Listing Agent" (trigger: loan_status = CTC)

**The issue:** The trigger function checks for the `field` key in `trigger_config`:
```sql
AND ta.trigger_config->>'field' IS NOT NULL
AND ta.trigger_config->>'field' = NEW.loan_status::text
```

But the automations have:
```json
{"field": "loan_status", "target_status": "CTC"}
```

The function is checking `trigger_config->>'field' = NEW.loan_status::text` which would be `"loan_status" = "CTC"` (FALSE).

It should check `trigger_config->>'target_status' = NEW.loan_status::text`.

### **Actual Bug Location**
`supabase/migrations/20260204154529_7296ef8d-7c58-4668-b7eb-ea48bc3b56a0.sql` line 30:
```sql
AND ta.trigger_config->>'loan_status' IS NOT NULL
AND ta.trigger_config->>'loan_status' = NEW.loan_status::text
```

Should be:
```sql
AND ta.trigger_config->>'target_status' IS NOT NULL  
AND ta.trigger_config->>'target_status' = NEW.loan_status::text
```

The trigger is looking for `loan_status` key but automations store it as `target_status`.

### **Solution**
Create new migration to fix the trigger function logic:

```sql
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  resolved_assignee_id UUID;
  fallback_assignee_id UUID := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';
  yousif_id UUID := '29ae7b57-9304-4c0b-9a85-7f3ad18c8acc';
  herman_id UUID := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';
  public_user_id UUID;
  prev_task_assignee UUID;
  loop_counter INTEGER := 0;
  new_task_id UUID;
  loan_type_val TEXT;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  RAISE LOG '[LoanStatusTrigger] Loan status changed from % to % for lead %', 
    OLD.loan_status::text, NEW.loan_status::text, NEW.id;

  -- Get loan type for refinance bypass logic
  loan_type_val := NEW.loan_type;

  -- Loop through all active automations for this trigger type  
  FOR automation_record IN 
    SELECT ta.* 
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'status_changed'
      AND ta.trigger_config->>'field' = 'loan_status'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    loop_counter := loop_counter + 1;
    RAISE LOG '[LoanStatusTrigger] Processing automation: % (ID: %)', automation_record.name, automation_record.id;

    -- Skip buyer's agent and listing agent tasks for refinance loans
    IF loan_type_val ILIKE '%Refinance%' THEN
      IF automation_record.task_name ILIKE '%buyer''s agent%' 
         OR automation_record.task_name ILIKE '%listing agent%' THEN
        RAISE LOG '[LoanStatusTrigger] Skipping agent-related task for refinance loan: %', automation_record.task_name;
        CONTINUE;
      END IF;
    END IF;

    -- Check if task with same name already exists for this lead (not completed, created within 14 days)
    IF EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND t.title = automation_record.task_name
        AND t.status::text NOT IN ('Done')
        AND t.created_at > (CURRENT_TIMESTAMP - INTERVAL '14 days')
    ) THEN
      RAISE LOG '[LoanStatusTrigger] Skipping - task "%" already exists (not done, <14 days old) for lead %', 
        automation_record.task_name, NEW.id;
      CONTINUE;
    END IF;

    -- Resolve assignment
    resolved_assignee_id := NEW.teammate_assigned;
    
    IF resolved_assignee_id IS NULL THEN
      SELECT t.assignee_id INTO prev_task_assignee
      FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND t.assignee_id IS NOT NULL
      ORDER BY t.created_at DESC
      LIMIT 1;
      
      IF prev_task_assignee IS NOT NULL THEN
        resolved_assignee_id := prev_task_assignee;
        RAISE LOG '[LoanStatusTrigger] Using previous task assignee: %', resolved_assignee_id;
      END IF;
    END IF;
    
    IF resolved_assignee_id IS NULL THEN
      resolved_assignee_id := yousif_id;
      RAISE LOG '[LoanStatusTrigger] Falling back to Yousif: %', resolved_assignee_id;
    END IF;

    -- Create the task
    INSERT INTO tasks (
      borrower_id,
      title,
      description,
      assignee_id,
      priority,
      status,
      due_date,
      automation_id
    ) VALUES (
      NEW.id,
      automation_record.task_name,
      COALESCE(automation_record.task_description, ''),
      resolved_assignee_id,
      (automation_record.default_priority)::task_priority,
      'To Do'::task_status,
      CURRENT_DATE,
      automation_record.id
    )
    RETURNING id INTO new_task_id;

    RAISE LOG '[LoanStatusTrigger] Created task "%" (ID: %) for lead %, assigned to %', 
      automation_record.task_name, new_task_id, NEW.id, resolved_assignee_id;

    -- Log execution
    INSERT INTO task_automation_executions (
      automation_id,
      lead_id,
      task_id,
      success,
      executed_at,
      trigger_data
    ) VALUES (
      automation_record.id,
      NEW.id,
      new_task_id,
      true,
      NOW(),
      jsonb_build_object(
        'old_loan_status', OLD.loan_status::text,
        'new_loan_status', NEW.loan_status::text
      )
    );

  END LOOP;

  RAISE LOG '[LoanStatusTrigger] Processed % automations for lead %', loop_counter, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### **Files to Create**
- New migration: `supabase/migrations/[timestamp]_fix_loan_status_trigger_logic.sql`

---

## Issue 4: Lender Email Tracking - Add Timestamp

### **Current Problem**
"Last Email Sent" column shows only the date (Feb 4, 2026) but not the time.

### **Solution**
Update the `ApprovedLenders.tsx` column rendering to include time using `formatDateTime` utility.

**Current (line ~1300):**
```tsx
{lender.last_email_sent_at 
  ? format(new Date(lender.last_email_sent_at), 'MMM dd, yyyy')
  : '—'}
```

**New:**
```tsx
{lender.last_email_sent_at 
  ? format(new Date(lender.last_email_sent_at), 'MMM dd, yyyy h:mm a')
  : '—'}
```

### **Files to Modify**
- `src/pages/contacts/ApprovedLenders.tsx`

---

## Issue 5: Lender Email Open/Reply Tracking

### **Current Problem**
No mechanism to track if lenders open emails or reply to them.

### **Solution - Phase 1 (Database Schema)**

Add new columns to `lenders` table:
```sql
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS last_email_opened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_email_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_replied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_email_replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_email_reply_content TEXT;
```

Add new columns to `ApprovedLenders.tsx` table:
- "EMAIL OPENED" - Badge (Yes/No with timestamp tooltip)
- "EMAIL REPLIED" - Badge (Yes/No with timestamp tooltip)

### **Solution - Phase 2 (Email Tracking Integration)**

**Note:** Email open/reply tracking requires integration with the email service provider (Ionos/SMTP). This is a more complex implementation requiring:

1. **Open Tracking:**
   - Embed tracking pixel in emails (1x1 transparent image)
   - Create edge function endpoint to receive pixel requests
   - Update lender record when pixel is loaded

2. **Reply Tracking:**  
   - Monitor IMAP inbox for replies
   - Match reply emails to original sent emails by subject/thread
   - Parse reply content and update lender record

For immediate implementation, we'll add the database schema and UI columns with manual entry capability. Automated tracking can be implemented in a future iteration.

### **Files to Modify**
- New migration for schema changes
- `src/pages/contacts/ApprovedLenders.tsx` (add columns)
- `src/components/modals/BulkLenderEmailModal.tsx` (add manual checkboxes for "Mark as Opened" / "Mark as Replied")

---

## Issue 6: Lender Detail Email History Section

### **Current Problem**
No section in LenderDetailDialog to view email history with open/reply status.

### **Solution**
Add new "Email History" section in `LenderDetailDialog` between EPO Period and Files sections.

**Section Features:**
- Show last 10 emails sent to this lender
- Display: Date/Time, Subject, Opened (Yes/No), Replied (Yes/No)
- Click to expand and view reply content
- Link to original email in Email tab

**Data Source:**
Query `email_logs` table filtered by `to_email = lender.account_executive_email`

### **Files to Modify**
- `src/components/LenderDetailDialog.tsx` (add new section)
- May need new query in database service

---

## Implementation Summary

### **Database Changes**
| Migration | Purpose |
|-----------|---------|
| Fix `execute_loan_status_changed_automations` trigger | Change from `loan_status` to `target_status` in trigger config lookup |
| Add email tracking columns to `lenders` | Support open/reply tracking |

### **UI Changes**
| File | Changes |
|------|---------|
| `ClientDetailDrawer.tsx` | Replace `FileUpdatesDisplay` with `MentionableInlineEditNotes` in Pipeline Review; add height constraint |
| `ApprovedLenders.tsx` | Add time to "Last Email Sent", add "Email Opened" and "Email Replied" columns |
| `LenderDetailDialog.tsx` | Add "Email History" section with engagement data |
| `BulkLenderEmailModal.tsx` | Add manual tracking checkboxes (optional) |

### **Expected Results**

1. ✅ **Latest File Update** - Clean, editable text box with metadata footer (matches About the Borrower)
2. ✅ **Pipeline Review** - Height-constrained, consistent UI
3. ✅ **Task Automations** - All CTC tasks will be created when loan_status changes to CTC
4. ✅ **Email Timestamps** - Full date/time shown in Last Email Sent column
5. ✅ **Email Engagement** - Track and display open/reply status for lender emails
6. ✅ **Email History** - Comprehensive view of all emails sent to each lender

---

## Testing Requirements

After implementation, **you MUST test**:

1. Change a lead's loan_status to CTC in Active pipeline → Verify 4 tasks are created
2. Click Latest File Update section → Verify it opens for editing like About the Borrower
3. Check Pipeline Review section height → Should not exceed Stage History height
4. Send a lender email → Verify timestamp includes time in Approved Lenders table
5. Open LenderDetailDialog → Verify Email History section displays

