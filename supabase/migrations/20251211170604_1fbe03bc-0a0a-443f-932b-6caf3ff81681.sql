-- Add arrive_loan_number field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS arrive_loan_number text;