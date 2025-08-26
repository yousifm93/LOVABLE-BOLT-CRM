-- ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE public.task_priority AS ENUM ('low','medium','high');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE public.task_status AS ENUM ('todo','in_progress','done');
  END IF;
END $$;

-- TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL,
  name TEXT NOT NULL,
  borrower_id UUID NULL,
  due_date DATE NULL,
  assigned_to UUID NULL,
  status public.task_status NOT NULL DEFAULT 'todo',
  task_order INT NOT NULL DEFAULT 0,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  creation_log JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- FKs (safe-guarded)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    ALTER TABLE public.tasks
      DROP CONSTRAINT IF EXISTS tasks_borrower_fk,
      ADD CONSTRAINT tasks_borrower_fk FOREIGN KEY (borrower_id) REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE public.tasks
      DROP CONSTRAINT IF EXISTS tasks_assigned_to_users_fk,
      ADD CONSTRAINT tasks_assigned_to_users_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.tasks
      DROP CONSTRAINT IF EXISTS tasks_created_by_users_fk,
      ADD CONSTRAINT tasks_created_by_users_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_borrower ON public.tasks(borrower_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their assigned tasks or created tasks" 
ON public.tasks 
FOR SELECT 
USING (assigned_to = auth.uid() OR created_by = auth.uid() OR 
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY IF NOT EXISTS "Users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update their assigned or created tasks" 
ON public.tasks 
FOR UPDATE 
USING (assigned_to = auth.uid() OR created_by = auth.uid() OR 
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin'));