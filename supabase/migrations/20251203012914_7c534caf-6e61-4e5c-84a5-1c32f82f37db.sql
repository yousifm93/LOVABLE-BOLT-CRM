-- Delete the 4 old test runs from November 5th, keep only the recent completed run
DELETE FROM pricing_runs 
WHERE started_at < '2024-12-01';