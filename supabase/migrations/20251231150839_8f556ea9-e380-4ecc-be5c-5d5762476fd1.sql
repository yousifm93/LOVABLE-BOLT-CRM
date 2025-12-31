-- Add reviewed_at timestamp column to tasks table
ALTER TABLE tasks ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;