-- Cancel all stuck pricing runs
UPDATE pricing_runs 
SET status = 'cancelled', completed_at = NOW() 
WHERE status IN ('running', 'pending');

-- Remove broken cron jobs (6:00 AM - 30yr_fixed, 6:15 AM - bank_statement, 6:20 AM - dscr)
SELECT cron.unschedule('refresh-30yr-fixed-daily');
SELECT cron.unschedule('refresh-bank-statement-daily');
SELECT cron.unschedule('refresh-dscr-daily');