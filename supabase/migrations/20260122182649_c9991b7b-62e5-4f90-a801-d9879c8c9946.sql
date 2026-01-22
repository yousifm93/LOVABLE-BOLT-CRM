-- Add updated_by column to condos table
ALTER TABLE public.condos
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create condo_change_logs table for activity tracking
CREATE TABLE IF NOT EXISTS public.condo_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condo_id UUID NOT NULL REFERENCES condos(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient querying by condo
CREATE INDEX IF NOT EXISTS idx_condo_change_logs_condo_id ON condo_change_logs(condo_id);
CREATE INDEX IF NOT EXISTS idx_condo_change_logs_created_at ON condo_change_logs(created_at DESC);

-- RLS Policies
ALTER TABLE condo_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read condo_change_logs"
  ON condo_change_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert condo_change_logs"
  ON condo_change_logs FOR INSERT TO authenticated WITH CHECK (true);