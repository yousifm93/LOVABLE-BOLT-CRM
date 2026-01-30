
# Plan: Fix CRM Issues - Appraisal Status, Column Width, and @ Mentions

## Summary of Issues Found

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | Appraisal status change to "Received" fails | Database trigger uses invalid `'Open'` task status enum value | Fix 3 database triggers to use `'To Do'` instead of `'Open'` |
| 2 | Condition Audit "Audit Notes" column too wide | Column width set to 200px but InlineEditNotes expands | Reduce column width and constrain the notes component |
| 3 | @ mention not showing team members | TipTap rich text editor doesn't expose keystroke events to wrapper | Need to integrate mention detection directly into TipTap |

---

## Issue 1: Appraisal Status Change Fails

### Root Cause Analysis

When the appraisal status changes (e.g., to "Received"), a database trigger `execute_appraisal_status_changed_automations` fires. This trigger creates tasks with `status = 'Open'`, but **'Open' is not a valid task_status enum value**.

**Valid task_status values:**
- `'To Do'`
- `'In Progress'`  
- `'Done'`
- `'Working on it'`
- `'Need help'`

**Database error:**
```
invalid input value for enum task_status: "Open"
```

### Affected Triggers

Three database functions use the invalid `'Open'` status:
1. `execute_appraisal_status_changed_automations`
2. `execute_package_status_changed_automations`
3. `execute_disclosure_status_changed_automations`

### Fix

Create a migration to update all three functions to use `'To Do'` instead of `'Open'`:

```sql
-- Fix execute_appraisal_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
-- ... change status = 'Open' to status = 'To Do'

-- Fix execute_package_status_changed_automations  
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
-- ... change status = 'Open' to status = 'To Do'

-- Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
-- ... change status = 'Open' to status = 'To Do'
```

---

## Issue 2: Condition Audit "Audit Notes" Column Too Wide

### Current State

The "Audit Notes" column uses `InlineEditNotes` which expands to fill available space. Even with `width: 200` set, the component stretches beyond that.

### Fix

1. **Reduce column width** from 200px to 180px
2. **Add max-width constraint** to the notes component wrapper
3. **Add wrapper div** with explicit width control

### Code Change in `ConditionAuditTable.tsx`

```typescript
{
  accessorKey: 'notes',
  header: 'Audit Notes',
  width: 180,  // Reduced from 200
  cell: ({ row }) => (
    <div onClick={(e) => e.stopPropagation()} className="max-w-[180px]">
      <InlineEditNotes
        value={row.original.notes}
        onValueChange={(value) => handleNotesUpdate(row.original.id, value)}
        placeholder="Add note..."
        className="text-xs"  // Smaller text
      />
    </div>
  )
}
```

---

## Issue 3: @ Mention Not Showing Team Members

### Root Cause Analysis

The `MentionableRichTextEditor` component wraps TipTap's `RichTextEditor` and tries to detect `@` symbols by parsing the HTML content. However, the detection logic has a flaw:

```typescript
// Current detection - checks if ANY data-user-id exists
const hasCompletedMention = newValue.includes('data-user-id');

if (isTypingMention && !hasCompletedMention && afterAt.length < 20) {
  setShowMentionPopover(true);  // This never runs if there's any prior mention
}
```

**Problem**: Once any mention is completed (has `data-user-id`), subsequent `@` symbols are ignored because `hasCompletedMention` is always true.

### Fix

Update the detection logic to:
1. Check if the CURRENT `@` is part of a completed mention
2. Not use a global check for `data-user-id`
3. Properly detect the @ symbol position in the HTML

### Updated Logic for `MentionableRichTextEditor.tsx`

```typescript
const handleContentChange = useCallback((newValue: string) => {
  onChange(newValue);

  // Strip HTML tags to get plain text for @ detection
  const plainText = newValue.replace(/<[^>]*>/g, '');
  const lastAtIndex = plainText.lastIndexOf('@');
  
  if (lastAtIndex !== -1) {
    const afterAt = plainText.substring(lastAtIndex + 1);
    // Check if we're in the middle of typing a mention (no space after @)
    const spaceIndex = afterAt.indexOf(' ');
    const newlineIndex = afterAt.indexOf('\n');
    const firstBreak = Math.min(
      spaceIndex === -1 ? Infinity : spaceIndex,
      newlineIndex === -1 ? Infinity : newlineIndex
    );
    
    // Check if there are characters between @ and the break (or end)
    const searchText = afterAt.substring(0, firstBreak === Infinity ? afterAt.length : firstBreak);
    
    // Only show popover if we're actively typing after @ and text is short
    if (searchText.length < 20 && (firstBreak === Infinity || searchText.length > 0)) {
      // Check if this specific @ is NOT already inside a completed mention span
      // by looking for the pattern in HTML
      const atPositionInHtml = newValue.lastIndexOf('@');
      const precedingHtml = newValue.substring(Math.max(0, atPositionInHtml - 100), atPositionInHtml);
      const isInsideMentionSpan = precedingHtml.includes('<span class="mention"') && 
                                   !precedingHtml.includes('</span>');
      
      if (!isInsideMentionSpan) {
        setMentionSearch(searchText.trim());
        setShowMentionPopover(true);
      } else {
        setShowMentionPopover(false);
      }
    } else {
      setShowMentionPopover(false);
    }
  } else {
    setShowMentionPopover(false);
  }
}, [onChange]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Fix 3 trigger functions to use valid task status enum |
| `src/components/admin/ConditionAuditTable.tsx` | Reduce Audit Notes column width, add max-width constraint |
| `src/components/ui/mentionable-rich-text-editor.tsx` | Fix @ detection logic to work with multiple mentions |

---

## Migration SQL

```sql
-- Fix trigger functions using invalid 'Open' task status

-- 1. Fix execute_appraisal_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'appraisal_status'
        AND ta.trigger_config->>'target_status' = NEW.appraisal_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,
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
        'To Do',  -- Fixed: was 'Open'
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
$$;

-- 2. Fix execute_package_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'package_status_change'
        AND ta.trigger_config->>'target_status' = NEW.package_status::text
    LOOP
      INSERT INTO tasks (
        lead_id,
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
        'To Do',  -- Fixed: was 'Open'
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
$$;

-- 3. Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'disclosure_status_change'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      INSERT INTO tasks (
        lead_id,
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
        'To Do',  -- Fixed: was 'Open'
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
$$;
```

---

## Expected Results After Fix

1. **Appraisal Status**: Changing to "Received" will work without errors - automation tasks will be created with valid `'To Do'` status
2. **Condition Audit Notes**: Column will be narrower and more readable
3. **@ Mentions**: Typing `@herman` will show the team member dropdown for selection
