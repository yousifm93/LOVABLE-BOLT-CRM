-- Create table to track feedback item status
CREATE TABLE team_feedback_item_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES team_feedback(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'needs_help')),
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feedback_id, item_index)
);

-- Enable RLS
ALTER TABLE team_feedback_item_status ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON team_feedback_item_status
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);