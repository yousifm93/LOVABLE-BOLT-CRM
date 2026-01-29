-- Add special_features and restrictions columns to lenders table
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS special_features text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS restrictions text[] DEFAULT '{}';