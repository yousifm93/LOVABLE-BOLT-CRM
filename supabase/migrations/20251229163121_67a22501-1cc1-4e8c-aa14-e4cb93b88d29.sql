-- Add dashboard tab permission columns
ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS dashboard_sales TEXT DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS dashboard_calls TEXT DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS dashboard_active TEXT DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS dashboard_closed TEXT DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS dashboard_miscellaneous TEXT DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS dashboard_all TEXT DEFAULT 'visible';