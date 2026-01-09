-- Add indexes to audit_log table for faster queries
-- Index for date range queries (most critical - used in ORDER BY)
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at DESC);

-- Index for table_name filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);

-- Index for changed_by user lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);

-- Composite index for common query pattern (table + date)
CREATE INDEX IF NOT EXISTS idx_audit_log_table_changed ON public.audit_log(table_name, changed_at DESC);

-- Index for item_id lookups (used in task completion queries)
CREATE INDEX IF NOT EXISTS idx_audit_log_item_id ON public.audit_log(item_id);

-- Add index for email_logs timestamp ordering
CREATE INDEX IF NOT EXISTS idx_email_logs_timestamp ON public.email_logs(timestamp DESC);

-- Add index for email_field_suggestions status queries
CREATE INDEX IF NOT EXISTS idx_email_field_suggestions_status ON public.email_field_suggestions(status);

-- Update query planner statistics
ANALYZE public.audit_log;
ANALYZE public.email_logs;
ANALYZE public.email_field_suggestions;