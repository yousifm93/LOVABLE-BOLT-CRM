-- Add the missing automation_id column to tasks table (required for task automations to work)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS automation_id uuid REFERENCES public.task_automations(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_automation_id ON public.tasks(automation_id);

-- Fix leads.deleted_by foreign key - drop incorrect constraint and add correct one
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_deleted_by_fkey;

-- Add the correct foreign key to public.users (not auth.users)
ALTER TABLE public.leads 
  ADD CONSTRAINT leads_deleted_by_fkey 
  FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;