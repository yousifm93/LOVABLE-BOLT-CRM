-- Create task_automations table
CREATE TABLE IF NOT EXISTS public.task_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('lead_created', 'status_changed', 'date_arrives', 'days_after_date', 'days_before_date')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  task_name TEXT NOT NULL,
  task_description TEXT NOT NULL,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  task_priority TEXT DEFAULT 'Medium' CHECK (task_priority IN ('High', 'Medium', 'Low')),
  due_date_offset_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view task automations"
  ON public.task_automations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage task automations"
  ON public.task_automations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'Admin'
    )
  );

-- Create function to execute task automations on lead creation
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
BEGIN
  -- Loop through all active lead_created automations
  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    -- Create the task
    INSERT INTO public.tasks (
      lead_id,
      title,
      description,
      assigned_to,
      priority,
      due_date,
      status,
      created_by
    ) VALUES (
      NEW.id,
      automation.task_name,
      automation.task_description,
      automation.assigned_to_user_id,
      automation.task_priority,
      CASE 
        WHEN automation.due_date_offset_days IS NOT NULL 
        THEN CURRENT_DATE + automation.due_date_offset_days
        ELSE NULL
      END,
      'To Do',
      NEW.created_by
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_execute_lead_created_automations ON public.leads;
CREATE TRIGGER trigger_execute_lead_created_automations
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_lead_created_automations();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_task_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_automations_updated_at ON public.task_automations;
CREATE TRIGGER update_task_automations_updated_at
  BEFORE UPDATE ON public.task_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_automations_updated_at();

-- Insert initial example automation
INSERT INTO public.task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  assigned_to_user_id,
  task_priority,
  is_active,
  created_by
) VALUES (
  'Follow up on new leads',
  'lead_created',
  '{}'::jsonb,
  'Follow up on new lead',
  'Following up on a new lead that was just created',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'Medium',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11'
);