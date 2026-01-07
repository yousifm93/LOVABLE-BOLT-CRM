-- Add updated_by column to lead_conditions table to track who made the last update
ALTER TABLE lead_conditions ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);