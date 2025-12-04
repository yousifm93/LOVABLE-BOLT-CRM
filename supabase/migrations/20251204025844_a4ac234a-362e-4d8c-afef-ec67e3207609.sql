-- Add filters column to pipeline_views table
ALTER TABLE pipeline_views ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '[]';

-- Clean up: Delete all non-Main View entries
DELETE FROM pipeline_views WHERE name != 'Main View';

-- Ensure is_default is true for all Main Views
UPDATE pipeline_views SET is_default = true WHERE name = 'Main View';