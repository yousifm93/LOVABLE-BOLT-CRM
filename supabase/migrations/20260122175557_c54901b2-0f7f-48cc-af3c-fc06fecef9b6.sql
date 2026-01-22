-- Add document columns to condos table for Budget, MIP, and CQ
ALTER TABLE public.condos
ADD COLUMN IF NOT EXISTS budget_doc TEXT,
ADD COLUMN IF NOT EXISTS mip_doc TEXT,
ADD COLUMN IF NOT EXISTS cq_doc TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.condos.budget_doc IS 'Storage path for condo budget document';
COMMENT ON COLUMN public.condos.mip_doc IS 'Storage path for Master Insurance Policy document';
COMMENT ON COLUMN public.condos.cq_doc IS 'Storage path for Condo Questionnaire document';