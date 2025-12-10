-- Create user_permissions table for role-based access control
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Section permissions: 'visible', 'hidden', 'locked'
  overview TEXT NOT NULL DEFAULT 'visible',
  tasks TEXT NOT NULL DEFAULT 'visible',
  pipeline TEXT NOT NULL DEFAULT 'visible',
  contacts TEXT NOT NULL DEFAULT 'visible',
  resources TEXT NOT NULL DEFAULT 'visible',
  calculators TEXT NOT NULL DEFAULT 'visible',
  admin TEXT NOT NULL DEFAULT 'hidden',
  -- Granular pipeline permissions
  pipeline_leads TEXT NOT NULL DEFAULT 'visible',
  pipeline_pending_app TEXT NOT NULL DEFAULT 'visible',
  pipeline_screening TEXT NOT NULL DEFAULT 'visible',
  pipeline_pre_qualified TEXT NOT NULL DEFAULT 'visible',
  pipeline_pre_approved TEXT NOT NULL DEFAULT 'visible',
  pipeline_active TEXT NOT NULL DEFAULT 'visible',
  pipeline_past_clients TEXT NOT NULL DEFAULT 'visible',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'Admin'
  )
);

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'Admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for existing users
INSERT INTO public.user_permissions (user_id, admin)
SELECT id, CASE WHEN role = 'Admin' THEN 'visible' ELSE 'hidden' END
FROM public.users
ON CONFLICT (user_id) DO NOTHING;