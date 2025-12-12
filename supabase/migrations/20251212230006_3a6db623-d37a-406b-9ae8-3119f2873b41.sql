-- Add loan_program column to income_calculations table
ALTER TABLE income_calculations ADD COLUMN IF NOT EXISTS loan_program text;