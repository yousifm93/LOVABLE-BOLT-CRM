-- Add lead_strength enum type
CREATE TYPE lead_strength AS ENUM ('Hot', 'Warm', 'Cold', 'Qualified');

-- Add lead_strength column to leads table
ALTER TABLE leads ADD COLUMN lead_strength lead_strength DEFAULT 'Warm';