-- Add new date fields for third-party items tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS appraisal_ordered_date DATE,
ADD COLUMN IF NOT EXISTS appraisal_scheduled_date DATE,
ADD COLUMN IF NOT EXISTS insurance_quoted_date DATE,
ADD COLUMN IF NOT EXISTS insurance_ordered_date DATE,
ADD COLUMN IF NOT EXISTS insurance_received_date DATE;