-- Delete all pricing runs except completed ones
DELETE FROM pricing_runs WHERE status != 'completed';