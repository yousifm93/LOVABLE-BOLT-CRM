-- Add INSERT policies for task_automation_executions
CREATE POLICY "Authenticated users can insert automation executions"
  ON task_automation_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);