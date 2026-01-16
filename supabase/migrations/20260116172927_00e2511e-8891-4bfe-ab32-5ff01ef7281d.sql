-- First, clear condo references from leads table
UPDATE public.leads SET condo_id = NULL WHERE condo_id IS NOT NULL;

-- Now clear existing data from condos table
DELETE FROM public.condos;

-- Drop columns we no longer need
ALTER TABLE public.condos 
  DROP COLUMN IF EXISTS area,
  DROP COLUMN IF EXISTS budget_file_url,
  DROP COLUMN IF EXISTS cq_file_url,
  DROP COLUMN IF EXISTS mip_file_url,
  DROP COLUMN IF EXISTS approval_source,
  DROP COLUMN IF EXISTS approval_type;

-- Drop the enum types if they exist
DROP TYPE IF EXISTS public.approval_source_type;
DROP TYPE IF EXISTS public.approval_type_type;

-- Add new columns
ALTER TABLE public.condos 
  ADD COLUMN IF NOT EXISTS source_uwm boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_ad boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_type text,
  ADD COLUMN IF NOT EXISTS primary_down text,
  ADD COLUMN IF NOT EXISTS second_down text,
  ADD COLUMN IF NOT EXISTS investment_down text;