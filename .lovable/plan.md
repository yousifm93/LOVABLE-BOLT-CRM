
# Plan: Improve Note Editor, Fix Mention Dropdown Position & Add Notification Badge System

## Summary

This plan addresses three distinct improvements:

1. **Make "Add Note" box larger** - Double the size of the note input area
2. **Fix mention dropdown position** - Move dropdown directly under the cursor/text area, not at the bottom of the screen
3. **Create notification badge system** - Track mentions and display badge next to Home tab with notification center

---

## Issue 1: Add Note Box Size

### Current State
The `AddNoteModal` in `ActivityLogModals.tsx` (line 928) wraps the `MentionableRichTextEditor` in a div with `max-h-[300px]`:
```tsx
<div className="max-h-[300px] overflow-y-auto border rounded-md">
  <MentionableRichTextEditor ... />
</div>
```

The rich text editor itself has `min-h-[200px]` in its styles.

### Fix
1. Increase the wrapper max-height from `300px` to `500px`
2. Increase the dialog width from `max-w-lg` to `max-w-2xl`
3. Update the rich text editor minimum height from `200px` to `300px`

### Code Changes
**File: `src/components/modals/ActivityLogModals.tsx`**
- Line 896: Change `max-w-lg` to `max-w-2xl`
- Line 928: Change `max-h-[300px]` to `max-h-[500px]`

**File: `src/components/ui/rich-text-editor.tsx`**
- Line 42: Change `min-h-[200px]` to `min-h-[300px]`

---

## Issue 2: Mention Dropdown Position

### Current State
The `MentionableRichTextEditor` component (line 146) positions the dropdown using:
```tsx
<div className="absolute top-full left-0 mt-1 z-[9999] ...">
```

This positions relative to the wrapper div, but when inside a modal with scroll or limited height, it appears at an awkward location.

### Root Cause
The dropdown is positioned `top-full` (below the entire editor container), which can place it very far from where the user is typing when the editor has content.

### Fix
Use a Portal (like Radix UI's Portal) to render the dropdown at the document body level, and use fixed positioning based on cursor/caret position. Alternatively, since implementing true caret tracking is complex, we can:

1. Use a Popover component from Radix UI with proper portal behavior
2. Position relative to the editor's bottom but with better stacking
3. Ensure the dropdown renders in a portal to escape modal clipping

### Implementation Approach
Wrap the mention dropdown in a `Popover` from Radix UI with portal rendering:

**File: `src/components/ui/mentionable-rich-text-editor.tsx`**
- Import `Popover, PopoverContent, PopoverTrigger, PopoverAnchor` from `@/components/ui/popover`
- Wrap the editor in a Popover with the dropdown as PopoverContent
- Use `side="bottom"` and `align="start"` for positioning
- The popover portal will ensure proper z-index and escape clipping

---

## Issue 3: Notification Badge System for Mentions

### Requirements
1. Track when a user is mentioned in a note or comment
2. Store unread mentions in a database table
3. Show a red badge number next to the "Home" menu item
4. When clicked, show a dropdown/popover listing all unread mentions
5. Clicking a mention navigates to the lead where they were tagged
6. Mark mentions as read when viewed

### Database Changes
Create a new `user_mentions` table:

```sql
CREATE TABLE user_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
  content_preview TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of unread mentions per user
CREATE INDEX idx_user_mentions_unread ON user_mentions(mentioned_user_id, is_read) WHERE is_read = false;

-- RLS policies
ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mentions"
  ON user_mentions FOR SELECT
  USING (mentioned_user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own mentions"
  ON user_mentions FOR UPDATE
  USING (mentioned_user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  ));
```

### Frontend Changes

**1. Update mention notification logic to also insert into database**

When saving a note/comment with mentions, after calling `send-mention-notification`:
- Insert a record into `user_mentions` for each mentioned user

**File: `src/components/modals/ActivityLogModals.tsx`** (AddNoteModal)
- After line 802 (after sending email notification), insert into `user_mentions` table

**File: `src/components/lead-details/ActivityCommentSection.tsx`**
- After line 87 (after sending notification), insert into `user_mentions` table

**2. Add MentionNotificationBadge component**

Create new component: `src/components/MentionNotificationBadge.tsx`
- Fetches unread mention count for current user
- Displays red badge with count
- On click, shows popover with list of mentions
- Each mention shows: mentioner name, lead name, preview, time ago
- Click navigates to lead and marks as read
- Real-time subscription to update count

**3. Update AppSidebar to include notification badge**

**File: `src/components/AppSidebar.tsx`**
- Add state for `unreadMentionCount`
- Fetch count on mount and subscribe to changes
- Add badge next to "Home" menu item (similar to how other badges work)
- Add a popover trigger that shows the mentions list

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Create `user_mentions` table with RLS |
| `src/components/modals/ActivityLogModals.tsx` | Increase dialog size, insert mentions to DB |
| `src/components/ui/rich-text-editor.tsx` | Increase min-height |
| `src/components/ui/mentionable-rich-text-editor.tsx` | Use Popover for dropdown positioning |
| `src/components/lead-details/ActivityCommentSection.tsx` | Insert mentions to DB |
| `src/components/MentionNotificationBadge.tsx` | New component for badge + popover |
| `src/components/AppSidebar.tsx` | Add mention badge next to Home |

---

## Technical Implementation Details

### Database Migration

```sql
-- Create user_mentions table for tracking @mentions
CREATE TABLE IF NOT EXISTS user_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
  content_preview TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_mentions_user_unread ON user_mentions(mentioned_user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_user_mentions_created ON user_mentions(created_at DESC);

-- Enable RLS
ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view their own mentions
CREATE POLICY "Users can view own mentions" ON user_mentions
  FOR SELECT USING (
    mentioned_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can update (mark as read) their own mentions  
CREATE POLICY "Users can update own mentions" ON user_mentions
  FOR UPDATE USING (
    mentioned_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Authenticated users can insert mentions
CREATE POLICY "Authenticated users can insert mentions" ON user_mentions
  FOR INSERT WITH CHECK (true);
```

### MentionNotificationBadge Component Structure

```tsx
// Key features:
// - useEffect to fetch unread count on mount
// - Realtime subscription to user_mentions table
// - Popover with list of mentions
// - Click handler to navigate and mark as read
// - Badge showing count (hidden if 0)
```

### Sidebar Integration

The Home menu item will include the badge similar to how Dashboard shows `pendingEmailQueueCount`:

```tsx
// In dashboardItems rendering, for Home:
{item.title === "Home" && (
  <MentionNotificationBadge />
)}
```

---

## Expected Results

1. **Larger Note Input**: The Add Note dialog will be wider (`max-w-2xl` = 672px vs `max-w-lg` = 512px) and the text area will be taller (500px max vs 300px)

2. **Better Dropdown Position**: The @mention dropdown will appear in a proper portal layer, positioned correctly below the text input regardless of modal context

3. **Notification System**: 
   - Red badge appears next to Home when user has unread mentions
   - Clicking badge shows popover with all mentions
   - Each mention shows who tagged them, which lead, and a preview
   - Clicking a mention opens that lead and marks the mention as read
   - Real-time updates when new mentions arrive
