-- Add N/A to cd_status enum
ALTER TYPE cd_status ADD VALUE IF NOT EXISTS 'N/A';

-- Add N/A to ba_status enum
ALTER TYPE ba_status ADD VALUE IF NOT EXISTS 'N/A';