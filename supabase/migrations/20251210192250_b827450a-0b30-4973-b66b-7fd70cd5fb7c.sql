-- Add reviewed column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed boolean DEFAULT false;