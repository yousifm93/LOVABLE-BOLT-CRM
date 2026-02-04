
The lender email tracking system currently has the foundational pieces in place (schema columns on the `lenders` table and a basic sync function), but it lacks the end-to-end automation and reliable data linkage needed for real-time tracking of opens and replies.

I will implement a comprehensive tracking system that links outgoing emails to lenders, captures SendGrid events (like opens), and automatically identifies replies from lender domains.

### 1. Database Schema Hardening
I will link the `email_logs` table directly to the `lenders` table to ensure we can precisely track every interaction.
- Add `lender_id` column to the `email_logs` table (UUID, referencing `lenders.id`).
- Ensure the `lenders` table has tracking columns for `last_email_opened`, `last_email_opened_at`, `last_email_replied`, and `last_email_replied_at`.

### 2. Upgrading the Email Delivery Engine (`send-direct-email`)
The core email function will be updated to handle the heavy lifting of tracking.
- **Atomic Logging**: When an email is sent to a lender, the function will automatically create an entry in `email_logs` with the correct `lender_id`.
- **Lender Updates**: It will automatically update the `lenders` table with `last_email_sent_at` and `last_email_subject`, removing the need for redundant frontend code.
- **Custom Tracking Args**: It will pass the `lender_id` and `email_log_id` as `custom_args` to SendGrid. This ensures that when an "Open" or "Click" occurs, the webhook knows exactly which lender and which specific email it belongs to.

### 3. Real-time Event Tracking (`email-webhooks`)
The webhook handler will be updated to propagate events back to the CRM.
- When SendGrid reports an "Open" event, the function will look for the `lender_id` in the event metadata.
- It will then update `last_email_opened_at` and set `last_email_opened = true` on the corresponding lender record in real-time.

### 4. Robust Reply Detection (`inbound-email-webhook` & `sync-lender-email-replies`)
I will implement two layers of reply detection to ensure no message is missed.
- **Real-time Detection**: The `inbound-email-webhook` (which handles incoming mail to scenarios@mortgagebolt.org) will be updated to match the sender's email against the `lenders` table. If a match is found, the incoming email will be logged with the correct `lender_id`.
- **Automated Sync (Fallback)**: I will schedule the `sync-lender-email-replies` function to run every hour using a database cron job. This function uses domain-based matching (e.g., catching any reply from `@uwm.com`) to identify replies that might not have been perfectly matched by the inbound webhook.

### 5. Frontend Simplification
With the backend handling the complexity, the frontend modals (`SendLenderEmailModal` and `BulkLenderEmailModal`) will be simplified.
- They will simply pass the `lender_id` to the email function.
- All "last sent" and "subject" tracking will happen automatically on the server, ensuring data consistency across the entire application.

### Technical Implementation Details
- **Migration**: A single SQL migration will add the `lender_id` column and set up the `pg_cron` schedule.
- **Logging**: Every outgoing lender email will now have a permanent audit trail in `email_logs`, visible in the CRM history.
- **Error Handling**: I'll include guards to handle cases where a lender might have multiple AE emails or shared domains.

### Technical Steps

```text
1. Run SQL migration to add email_logs.lender_id and setup cron.
2. Update supabase/functions/send-direct-email/index.ts to handle logging and custom_args.
3. Update supabase/functions/email-webhooks/index.ts to sync 'open' events to lenders.
4. Update supabase/functions/inbound-email-webhook/index.ts to link incoming lender mail.
5. Update src/components/modals/SendLenderEmailModal.tsx to pass lender_id.
6. Update src/components/modals/BulkLenderEmailModal.tsx to pass lender_id and remove manual updates.
```
