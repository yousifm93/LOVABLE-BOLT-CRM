-- Create task_assignees junction table for many-to-many relationship
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Create policies for task assignees (same access as tasks)
CREATE POLICY "Users can view task assignments" 
  ON public.task_assignees 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create task assignments" 
  ON public.task_assignees 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update task assignments" 
  ON public.task_assignees 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete task assignments" 
  ON public.task_assignees 
  FOR DELETE 
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);

-- Migrate existing assignee_id data to the new table
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assignee_id 
FROM public.tasks 
WHERE assignee_id IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;