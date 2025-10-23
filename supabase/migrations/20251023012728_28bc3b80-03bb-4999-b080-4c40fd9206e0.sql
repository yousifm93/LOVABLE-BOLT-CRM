-- Add approved_lender_id column to leads table
ALTER TABLE public.leads
ADD COLUMN approved_lender_id uuid NULL;

-- Add foreign key constraint to lenders table
ALTER TABLE public.leads
ADD CONSTRAINT fk_leads_approved_lender
FOREIGN KEY (approved_lender_id)
REFERENCES public.lenders (id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS leads_approved_lender_id_idx
ON public.leads (approved_lender_id);