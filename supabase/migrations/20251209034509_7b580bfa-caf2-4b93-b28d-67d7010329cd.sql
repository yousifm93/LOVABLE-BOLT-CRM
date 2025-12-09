ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS discount_points numeric;
COMMENT ON COLUMN public.leads.discount_points IS 'Rate lock discount points (e.g., 1.27)';