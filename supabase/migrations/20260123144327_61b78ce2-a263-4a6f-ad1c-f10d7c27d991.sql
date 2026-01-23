-- Add soft delete columns to condos table
ALTER TABLE public.condos
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

-- Index for efficient filtering of non-deleted condos
CREATE INDEX IF NOT EXISTS idx_condos_deleted_at ON condos(deleted_at) WHERE deleted_at IS NULL;