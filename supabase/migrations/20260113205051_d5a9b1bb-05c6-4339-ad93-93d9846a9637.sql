-- Cancel any stuck pricing runs that are still in 'running' status
UPDATE pricing_runs 
SET status = 'cancelled', 
    completed_at = COALESCE(completed_at, now()), 
    error_message = COALESCE(error_message, 'Cancelled by admin cleanup - stuck run')
WHERE status = 'running';