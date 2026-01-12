-- Delete all pricing runs with status='running' except the most recent one
DELETE FROM pricing_runs 
WHERE status = 'running' 
AND id != 'c7077849-98bc-4ad2-87f1-ccf5dd43eae5';