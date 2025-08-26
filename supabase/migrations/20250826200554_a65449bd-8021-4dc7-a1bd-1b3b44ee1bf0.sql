-- Add missing columns and update existing ones
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS creation_log JSONB DEFAULT '[]'::jsonb;

-- Copy data from old columns to new ones
UPDATE public.tasks 
SET name = title 
WHERE name IS NULL AND title IS NOT NULL;

UPDATE public.tasks 
SET assigned_to = assignee_id 
WHERE assigned_to IS NULL AND assignee_id IS NOT NULL;

-- Set NOT NULL constraint on name after data migration
ALTER TABLE public.tasks 
  ALTER COLUMN name SET NOT NULL;

-- Update default values
ALTER TABLE public.tasks 
  ALTER COLUMN task_order SET NOT NULL,
  ALTER COLUMN task_order SET DEFAULT 0;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tasks_borrower ON public.tasks(borrower_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);