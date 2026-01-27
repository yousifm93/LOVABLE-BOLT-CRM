
# Plan: Email Preview Modal Before Sending

## Overview
Create a new modal that shows a fully rendered preview of the email (with merge tags replaced) before sending. Users can review the email content, make adjustments if needed, and then confirm sending.

## User Flow
1. User selects sender, template, and recipients in the "Send Email Templates" card
2. User clicks "Send Email" button
3. **NEW**: A preview modal opens showing:
   - Subject line (template name with merge tags replaced)
   - From/To/CC information
   - Fully rendered email preview (HTML with all merge tags replaced)
   - Option to edit the email body before sending
4. User clicks "Send" in the modal to actually send the email

## Implementation Details

### 1. Create New Edge Function: `preview-template-email`
**File**: `supabase/functions/preview-template-email/index.ts`

This function will:
- Accept `leadId`, `templateId`, and `senderId`
- Fetch all the same data as `send-template-email` (lead, template, sender, relationships)
- Replace all merge tags in the template
- Append the sender's email signature
- Return the processed HTML, subject, and sender info (WITHOUT sending)

```text
Request:
{
  leadId: string;
  templateId: string;
  senderId: string;
}

Response:
{
  subject: string;
  htmlContent: string;
  sender: { email: string; name: string };
  recipientEmails: { borrower?: string; agent?: string };
}
```

### 2. Create Email Preview Modal Component
**File**: `src/components/modals/EmailPreviewModal.tsx`

Modal features:
- Dialog with max-width ~800px for email preview
- Header showing "Email Preview"
- Read-only fields for: From, To, CC, Subject
- **Editable** rich text editor pre-filled with the processed email HTML
- Cancel and Send buttons in footer
- Loading state while generating preview
- Send button triggers the actual email send

### 3. Update SendEmailTemplatesCard
**File**: `src/components/lead-details/SendEmailTemplatesCard.tsx`

Changes:
- Add state for preview modal: `showPreviewModal`, `previewData`
- Change `handleSendEmail` to:
  1. Validate inputs (same as now)
  2. Call `validate-template-merge-tags` (same as now)
  3. **NEW**: Call `preview-template-email` to get rendered preview
  4. **NEW**: Open preview modal with the data
- Add new function `handleConfirmSend` that:
  - Takes the (possibly edited) email content
  - Calls `send-template-email` with optional `customHtml` parameter
- Import and render `EmailPreviewModal` component

### 4. Update send-template-email Edge Function
**File**: `supabase/functions/send-template-email/index.ts`

Add optional parameter:
- `customHtml?: string` - If provided, use this HTML instead of processing the template
- This allows sending the user-edited version from the preview

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/preview-template-email/index.ts` | Create | New edge function to generate email preview |
| `src/components/modals/EmailPreviewModal.tsx` | Create | New modal component for email preview |
| `src/components/lead-details/SendEmailTemplatesCard.tsx` | Modify | Add preview modal state and flow |
| `supabase/functions/send-template-email/index.ts` | Modify | Accept optional `customHtml` parameter |

## Technical Approach

### Preview Edge Function Logic
The preview function will share the same merge tag replacement logic as the send function:

```typescript
// Same data fetching as send-template-email
- Fetch lead with relationships (buyer_agent, approved_lender, etc.)
- Fetch listing agent from lead_external_contacts
- Fetch template
- Fetch sender and their email signature

// Build merge data and replace tags
- Apply currency/date formatting for crm_fields
- Replace all {{tag}} patterns with values
- Append email signature

// Return preview data (don't send)
return { subject, htmlContent, sender, recipientEmails }
```

### Modal Component Structure
```text
EmailPreviewModal
├── DialogHeader: "Email Preview"
├── DialogContent
│   ├── From field (read-only)
│   ├── To field (read-only)  
│   ├── CC field (read-only)
│   ├── Subject field (read-only)
│   └── Email body (RichTextEditor, editable)
└── DialogFooter
    ├── Cancel button
    └── Send button (with loading state)
```

### State Flow in SendEmailTemplatesCard
```text
1. User clicks "Send Email"
2. Validate inputs → Show error toast if invalid
3. Validate merge tags → Show missing fields modal if invalid
4. Call preview-template-email → Show loading
5. Open EmailPreviewModal with preview data
6. User reviews/edits content
7. User clicks "Send" in modal
8. Call send-template-email with customHtml
9. Show success toast, close modal, reset form
```

## Edge Cases Handled

- **Edited email**: If user modifies content in preview, send the modified version
- **Loading states**: Show spinner while generating preview and while sending
- **Error handling**: Toast errors for preview generation failures
- **Large emails**: Modal has scrollable content area with max-height
- **HTML preservation**: Rich text editor properly handles incoming HTML

## Expected Outcome

When users click "Send Email" on a template:
1. A modal appears with the fully rendered email preview
2. They see exactly what recipients will receive (with all {{tags}} replaced)
3. They can edit the content if adjustments are needed
4. Clicking "Send" in the modal sends the email
5. They get confirmation that the email was sent
