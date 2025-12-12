-- Insert the Extend Rate Lock automation into task_automations table
INSERT INTO public.task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  is_active,
  category,
  subcategory,
  completion_requirement_type,
  completion_requirement_config
) VALUES (
  'Extend Rate Lock',
  'status_changed',
  '{"field": "close_date", "condition": "close_date_past_lock_expiration"}'::jsonb,
  'Extend Rate Lock',
  'Rate lock expiration is before the closing date. Extend the rate lock immediately to avoid rate re-pricing.',
  'High',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  true,
  'active_loan',
  'other',
  'manual',
  '{"description": "Rate lock extended or new lock obtained"}'::jsonb
);

-- Update the trigger function to check if automation is active
CREATE OR REPLACE FUNCTION public.execute_extend_rate_lock_automation()
RETURNS TRIGGER AS $$
DECLARE
  automation_active boolean;
  automation_assignee uuid;
BEGIN
  -- Only proceed if close_date was updated
  IF NEW.close_date IS NULL OR OLD.close_date = NEW.close_date THEN
    RETURN NEW;
  END IF;
  
  -- Only proceed if we have a lock_expiration_date to compare
  IF NEW.lock_expiration_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only proceed if close_date is now past lock_expiration_date
  IF NEW.close_date <= NEW.lock_expiration_date THEN
    RETURN NEW;
  END IF;
  
  -- Check if the automation is active in task_automations table
  SELECT is_active, assigned_to_user_id INTO automation_active, automation_assignee
  FROM public.task_automations 
  WHERE name = 'Extend Rate Lock' AND category = 'active_loan'
  LIMIT 1;
  
  -- If automation not found or not active, skip
  IF automation_active IS NULL OR automation_active = false THEN
    RETURN NEW;
  END IF;
  
  -- Check if a similar task already exists for this lead
  IF EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE borrower_id = NEW.id 
    AND title ILIKE '%extend rate lock%'
    AND status != 'Done'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Create the task using automation assignee or lead's teammate
  INSERT INTO public.tasks (
    title,
    description,
    due_date,
    priority,
    borrower_id,
    assignee_id,
    status
  ) VALUES (
    'Extend Rate Lock',
    'Rate lock expiration is before the closing date. Extend the rate lock immediately to avoid rate re-pricing.',
    CURRENT_DATE,
    'High',
    NEW.id,
    COALESCE(automation_assignee, NEW.teammate_assigned),
    'To Do'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;