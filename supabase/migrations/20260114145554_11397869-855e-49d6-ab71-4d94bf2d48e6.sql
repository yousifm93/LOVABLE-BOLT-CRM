-- Allow authenticated users to update/cancel dashboard pricing runs
-- Dashboard runs have scenario_type set but created_by is null (created by cron)
CREATE POLICY "Authenticated users can update dashboard pricing runs"
ON pricing_runs
FOR UPDATE
TO authenticated
USING (scenario_type IS NOT NULL);