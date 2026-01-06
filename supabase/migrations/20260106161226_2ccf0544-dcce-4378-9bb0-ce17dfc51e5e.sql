-- Add RLS policy to allow authenticated users to read dashboard pricing runs
CREATE POLICY "Authenticated users can read dashboard pricing runs"
ON public.pricing_runs
FOR SELECT
TO authenticated
USING (scenario_type IS NOT NULL);