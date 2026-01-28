

# Plan: Increase Bulk Lender Email Modal Editor Height

## Issue
The **Bulk Lender Email Modal** (shown in your screenshot with "Send Email to 2 Lenders") has a smaller text editor area than the single lender modal. While the dialog container is already set to `max-h-[90vh]`, the RichTextEditor inside is only `min-h-[200px]`.

## Change

### File: `src/components/modals/BulkLenderEmailModal.tsx`

**Line 328 - Increase the RichTextEditor height:**

| Current | Updated |
|---------|---------|
| `className="min-h-[200px]"` | `className="min-h-[350px]"` |

This matches the height we set for the single lender modal.

## Result
Both email modals (single and bulk) will have the same 350px minimum height for the message composer, giving you more room to write longer emails.

