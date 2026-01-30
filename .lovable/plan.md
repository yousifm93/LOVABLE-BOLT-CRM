
# Plan: Fix Mention Dropdown Position, Update Email Branding, Enable Ashley's Email & Fix Badge Click

## Summary

This plan addresses five distinct improvements:

1. **Lower the mention dropdown** - Position it at `top: 80px` instead of `50px` to appear closer to text
2. **Dismiss dropdown on selection** - Already working, but ensure focus returns to editor
3. **Brand the mention notification email** - Update to Mortgage Vault style (yellow header #EAB308, black text, logo)
4. **Enable Ashley's email access** - Update her permission `email: locked` → `email: visible`
5. **Make notification badge clickable with popover** - Badge already has popover functionality but may need z-index fix

---

## Issue 1: Mention Dropdown Position Too High

### Current State
The dropdown is positioned at `top: '50px'` which places it just below the toolbar. The user wants it lower, closer to where they're typing.

### Fix
Change from `top: '50px'` to `top: '80px'` to position it further down, closer to the text area.

**File: `src/components/ui/mentionable-rich-text-editor.tsx`**
- Line 147: Change `style={{ top: '50px' }}` to `style={{ top: '80px' }}`

---

## Issue 2: Dropdown Blocking Typing After Selection

### Current State
The `insertMention` function calls `setShowMentionPopover(false)` at line 127-128, which should hide the dropdown. However, the dropdown may visually persist.

### Root Cause
The `onSelect` event on `CommandItem` may have propagation issues. Additionally, clicking outside the editor area doesn't properly dismiss.

### Fix
1. Add explicit `setShowMentionPopover(false)` call that triggers immediately
2. Ensure `mentionSearch` is cleared to prevent re-triggering on next content change

The current code already does this - the issue may be that the selection triggers a content change which re-opens the popover. We need to add a brief delay or flag to prevent immediate re-opening.

**File: `src/components/ui/mentionable-rich-text-editor.tsx`**
Add a ref to track recent insertions and skip popover opening:
```tsx
const justInsertedRef = useRef(false);

const insertMention = (member: TeamMember) => {
  justInsertedRef.current = true;
  // ... existing insert logic ...
  setShowMentionPopover(false);
  setMentionSearch('');
  
  // Reset flag after a brief delay
  setTimeout(() => {
    justInsertedRef.current = false;
  }, 100);
};

// In handleContentChange, skip if just inserted
if (!justInsertedRef.current && !isInsideMentionSpan) {
  setMentionSearch(searchText.trim());
  setShowMentionPopover(true);
}
```

---

## Issue 3: Brand Mention Notification Email (Mortgage Vault Style)

### Current State
The email uses blue header (#2563eb) with generic "Mortgage Bolt CRM" branding.

### Fix
Update the email template in `send-mention-notification/index.ts` to match Mortgage Vault branding:
- Yellow header (#EAB308) with black text
- Lightning bolt emoji ⚡
- "Mortgage Bolt" branding (consistent with other emails)
- Yellow CTA button with dark text
- Footer with company info

**File: `supabase/functions/send-mention-notification/index.ts`**
Replace the `emailHtml` template (lines 60-96) with branded version matching `send-document-requests`.

---

## Issue 4: Enable Email for Ashley Merizio

### Current State
Ashley's permissions have `email: locked`.

### Fix
Update the `user_permissions` table to set `email: visible` for Ashley (user_id: `3dca68fc-ee7e-46cc-91a1-0c6176d4c32a`).

**SQL Migration:**
```sql
UPDATE user_permissions
SET email = 'visible'
WHERE user_id = '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a';
```

---

## Issue 5: Notification Badge Popover Not Opening

### Current State
The `MentionNotificationBadge` component already has a Popover with click handler. Looking at the screenshot, the badge (red "2") is visible next to Home. The user says clicking it doesn't open the popover.

### Analysis
The badge is rendered inside a `NavLink`, which may be intercepting clicks and navigating instead of opening the popover. The popover trigger may need `event.stopPropagation()` and `event.preventDefault()`.

### Fix
Wrap the PopoverTrigger's Badge in a proper click handler that stops propagation:

**File: `src/components/MentionNotificationBadge.tsx`**
```tsx
<PopoverTrigger asChild>
  <Badge 
    variant="destructive" 
    className="h-5 min-w-5 px-1.5 text-xs cursor-pointer ml-1"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
  >
    {unreadCount}
  </Badge>
</PopoverTrigger>
```

Also ensure PopoverContent has high z-index to appear above sidebar elements.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/mentionable-rich-text-editor.tsx` | Lower dropdown position (80px), add flag to prevent re-opening after insert |
| `supabase/functions/send-mention-notification/index.ts` | Rebrand email with yellow header, logo, Mortgage Vault styling |
| `src/components/MentionNotificationBadge.tsx` | Add stopPropagation to prevent NavLink from intercepting clicks |
| `supabase/migrations/[new].sql` | Update Ashley's email permission to 'visible' |

---

## Technical Details

### Updated Mention Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Yellow Header with Lightning Bolt -->
          <tr>
            <td style="background-color: #EAB308; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <span style="font-size: 28px;">⚡</span>
              <span style="color: #1e293b; font-size: 24px; font-weight: 700; margin-left: 8px; vertical-align: middle;">
                Mortgage Bolt
              </span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">
                You were mentioned in a note
              </h2>
              
              <p style="margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${mentionerName}</strong> mentioned you in a note on <strong>${leadName}</strong>:
              </p>
              
              <!-- Note Preview -->
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EAB308;">
                <p style="margin: 0; color: #475569; font-size: 14px; font-style: italic;">
                  "${notePreview}"
                </p>
              </div>
              
              <!-- CTA Button (Yellow) -->
              <table role="presentation" style="width: 100%; margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${leadUrl}" 
                       style="display: inline-block; padding: 16px 48px; background-color: #EAB308; color: #1e293b; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      View in CRM
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 600;">
                Mortgage Bolt
              </p>
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                848 Brickell Avenue, Suite 840, Miami, FL 33131<br>
                (352) 328-9828
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Expected Results

1. **Dropdown Position**: Appears lower on the screen (80px from top of editor), closer to text input area
2. **Dropdown Dismissal**: Properly closes after selecting a team member, allowing continued typing
3. **Branded Email**: Mention notification emails match Mortgage Vault branding with yellow header, logo, and styled footer
4. **Ashley's Email Access**: She can now access the Email tab in the sidebar to see processing@mortgagevault.org inbox
5. **Badge Clickable**: Clicking the red badge opens a popover showing all mentions with navigation links
