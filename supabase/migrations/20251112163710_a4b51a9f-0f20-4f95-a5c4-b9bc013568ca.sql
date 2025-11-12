-- Add condo_id foreign key to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS condo_id uuid REFERENCES public.condos(id);

-- Update crm_fields to change condo_name to condo_id with relationship type
UPDATE public.crm_fields 
SET field_name = 'condo_id',
    display_name = 'Condo',
    field_type = 'relationship',
    description = 'Link to condo record in the condo directory',
    updated_at = now()
WHERE field_name = 'condo_name';

-- Soft delete condo_docs_file field (no longer needed)
UPDATE public.crm_fields 
SET is_in_use = false, 
    updated_at = now()
WHERE field_name = 'condo_docs_file';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_condo_id ON public.leads(condo_id);