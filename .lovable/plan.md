
# Processor Role Sidebar Refinements

## Summary of Changes

Based on Ashley's current permissions and your requirements, I'll make several code changes to the sidebar and update the database permissions.

---

## Change 1: Make Review Feedback Visible for Processors

**Issue**: Review Feedback is currently controlled by `admin !== 'hidden'`, so Ashley can't see it.

**Solution**: Add a new permission check or use a different condition. Since you want processors to be able to see and use the Feedback section (both Submit and Review), I'll:
- Keep "Submit Feedback" visible for everyone
- Make "Review Feedback" visible based on a new `admin_feedback_review` permission OR simply show it for Processors

**File**: `src/components/AppSidebar.tsx` (lines 877-889)

---

## Change 2: Pipeline Section - Always Expanded, No Toggle for Single Item

**Issue**: When there's only one pipeline item visible (Active), the collapsible group is unnecessary.

**Solution**: Add logic to render pipeline items without the CollapsibleSidebarGroup wrapper when the user has only one visible pipeline item. For processors, just show "Active" as a flat item in the dashboard section.

**File**: `src/components/AppSidebar.tsx` (lines 615-674)

**Approach**: Count visible pipeline items, and if count === 1, render inline without the collapsible wrapper.

---

## Change 3: Hide Red Badge (144) on Active for Processors

**Issue**: The `pendingSuggestionCount` badge on Active is admin-related (email field suggestions for auto-update).

**Solution**: Only show this badge if user has admin access or is not a Processor.

**File**: `src/components/AppSidebar.tsx` (lines 640-661)

**Logic**: Add condition `{pendingSuggestionCount > 0 && hasPermission('admin') !== 'hidden' && (...)}`

---

## Change 4: Fix Badge on Submit Feedback

**Issue**: The `unreadResponseCount` (2) badge is correctly showing on Submit Feedback (responses TO the user), but you want this count to only show on Review Feedback.

**Wait** - Actually, reviewing the code:
- Submit Feedback shows `unreadResponseCount` (admin responses the user hasn't read)
- Review Feedback shows `newFeedbackCount` (new feedback for admin to review)

This seems correct - Ashley would see a badge if an admin responded to her feedback. If you want NO badge on Submit Feedback for processors, I'll add that condition.

**Solution**: Hide the unreadResponseCount badge for Processors on Submit Feedback.

**File**: `src/components/AppSidebar.tsx` (lines 869-873)

---

## Change 5: Hide Home Page for Processors

**Solution**: Update database permission to set `home: 'hidden'`

---

## Change 6: Lock Email for Processors

**Solution**: Update database permission to set `email: 'locked'`

---

## Change 7: Set Default Landing Page to Tasks

**Solution**: Update database permission to set `default_landing_page: '/tasks'`

---

## Database Update (SQL)

Run this in Supabase SQL Editor:

```sql
UPDATE user_permissions 
SET 
  home = 'hidden',
  email = 'locked',
  default_landing_page = '/tasks'
WHERE user_id = (SELECT id FROM users WHERE role = 'Processor');
```

---

## Code Changes Summary

### File: `src/components/AppSidebar.tsx`

| Line Range | Change |
|------------|--------|
| 615-674 | Render pipeline items inline (not collapsible) when only 1 visible item |
| 640-661 | Hide pending suggestion badge for Processors (check admin permission) |
| 858-891 | Remove badge from Submit Feedback for Processors; keep Review Feedback accessible |
| 877-889 | Change Review Feedback visibility to not require admin (use different check) |

### New Logic Details

1. **Pipeline rendering**:
```tsx
const visiblePipelineItems = filterItemsByPermission(pipelineItems);
const singlePipelineItem = visiblePipelineItems.length === 1;

// If single item, render without collapsible wrapper
{singlePipelineItem ? (
  <SidebarGroup className="mb-4">
    <span className="px-3 py-1 text-xs font-medium text-muted-foreground">Pipeline</span>
    <SidebarMenu>
      {/* render the single item */}
    </SidebarMenu>
  </SidebarGroup>
) : (
  <CollapsibleSidebarGroup ...>
    {/* existing logic */}
  </CollapsibleSidebarGroup>
)}
```

2. **Active badge visibility**:
```tsx
{pendingSuggestionCount > 0 && hasPermission('admin') !== 'hidden' && (
  <Badge ...>{pendingSuggestionCount}</Badge>
)}
```

3. **Feedback section**:
- Remove `unreadResponseCount` badge for non-admins
- Show Review Feedback for any user who should review (add permission or role check)

---

## Future Processors

All these changes are permission-based, so any new user with `role = 'Processor'` will automatically:
1. Get redirected to `/tasks` on login
2. Have Home hidden
3. Have Email locked
4. See only Active in a non-collapsible Pipeline section
5. Not see admin-related badges
6. Have access to Submit and Review Feedback

---

## Files Modified

1. `src/components/AppSidebar.tsx` - Sidebar rendering logic
2. Database: `user_permissions` table - Permission values for Processor role
