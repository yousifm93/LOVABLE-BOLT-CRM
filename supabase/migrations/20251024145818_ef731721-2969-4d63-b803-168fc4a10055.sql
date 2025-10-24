-- Add missing values to converted_status ENUM for CRM pipeline updates
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Ready for Pre-Approval';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Incoming';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Long Term';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Closed';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Need Support';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'New Lead';

-- Add 'New RFP' to loan_status ENUM for Active board
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'New RFP';

-- Note: The database shows 'SUV' in loan_status but code expects 'SUB'. 
-- We'll update the frontend to match what's actually in the database.