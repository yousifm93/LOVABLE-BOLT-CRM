-- Add PRMG as a new lender source for condos
ALTER TABLE public.condos ADD COLUMN IF NOT EXISTS source_prmg boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.condos.source_prmg IS 'Indicates if this condo is approved by PRMG lender';