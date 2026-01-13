UPDATE pricing_runs 
SET status = 'cancelled' 
WHERE status = 'running';