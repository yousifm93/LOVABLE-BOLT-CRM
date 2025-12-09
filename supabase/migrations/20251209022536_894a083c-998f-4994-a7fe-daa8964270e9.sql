-- Add new fields for appraisal received date and subject property rental income
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS appraisal_received_on DATE,
ADD COLUMN IF NOT EXISTS subject_property_rental_income NUMERIC;