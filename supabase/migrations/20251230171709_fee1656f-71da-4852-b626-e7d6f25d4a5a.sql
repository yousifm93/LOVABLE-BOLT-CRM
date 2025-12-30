-- Add CalDAV authentication columns to user_calendar_settings
ALTER TABLE public.user_calendar_settings 
ADD COLUMN IF NOT EXISTS caldav_username TEXT,
ADD COLUMN IF NOT EXISTS caldav_password TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_calendar_settings.caldav_username IS 'Username for CalDAV authentication (if using CalDAV instead of ICS)';
COMMENT ON COLUMN public.user_calendar_settings.caldav_password IS 'Password for CalDAV authentication (if using CalDAV instead of ICS)';