-- Add missing values to appraisal_status enum
ALTER TYPE public.appraisal_status ADD VALUE IF NOT EXISTS 'On Hold';

-- Add missing values to condo_status enum  
ALTER TYPE public.condo_status ADD VALUE IF NOT EXISTS 'Transfer';
ALTER TYPE public.condo_status ADD VALUE IF NOT EXISTS 'On Hold';