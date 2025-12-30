-- Create table for per-user calendar settings (ICS URL storage)
CREATE TABLE public.user_calendar_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ics_url TEXT,
  calendar_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_calendar_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own calendar settings
CREATE POLICY "Users can view their own calendar settings"
ON public.user_calendar_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own calendar settings
CREATE POLICY "Users can create their own calendar settings"
ON public.user_calendar_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own calendar settings
CREATE POLICY "Users can update their own calendar settings"
ON public.user_calendar_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own calendar settings
CREATE POLICY "Users can delete their own calendar settings"
ON public.user_calendar_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all calendar settings
CREATE POLICY "Admins can view all calendar settings"
ON public.user_calendar_settings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid() AND users.role = 'Admin'::user_role
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_calendar_settings_updated_at
BEFORE UPDATE ON public.user_calendar_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();