-- Create task_automation_executions table to track automation runs
CREATE TABLE IF NOT EXISTS public.task_automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.task_automations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Add index for faster counting
CREATE INDEX idx_task_automation_executions_automation_id 
  ON public.task_automation_executions(automation_id);

-- Enable RLS
ALTER TABLE public.task_automation_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for viewing executions
CREATE POLICY "Authenticated users can view automation executions"
  ON public.task_automation_executions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update the execute_lead_created_automations function to log executions
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
BEGIN
  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    BEGIN
      -- Create the task
      INSERT INTO public.tasks (
        borrower_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority::task_priority,
        CASE 
          WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days
          ELSE CURRENT_DATE
        END,
        'Working on it'::task_status,
        NEW.created_by
      )
      RETURNING id INTO new_task_id;
      
      -- Log successful execution
      INSERT INTO public.task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        success
      ) VALUES (
        automation.id,
        NEW.id,
        new_task_id,
        true
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log failed execution
      INSERT INTO public.task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        success,
        error_message
      ) VALUES (
        automation.id,
        NEW.id,
        NULL,
        false,
        SQLERRM
      );
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;