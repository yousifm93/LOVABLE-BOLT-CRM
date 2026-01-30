-- Create user_mentions table for tracking @mentions and notifications
CREATE TABLE IF NOT EXISTS user_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
  content_preview TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX idx_user_mentions_user_unread ON user_mentions(mentioned_user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_user_mentions_created ON user_mentions(created_at DESC);
CREATE INDEX idx_user_mentions_lead ON user_mentions(lead_id);

-- Enable RLS
ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view their own mentions
CREATE POLICY "Users can view own mentions" ON user_mentions
  FOR SELECT USING (
    mentioned_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Users can update (mark as read) their own mentions  
CREATE POLICY "Users can update own mentions" ON user_mentions
  FOR UPDATE USING (
    mentioned_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Authenticated users can insert mentions (when someone tags another user)
CREATE POLICY "Authenticated users can insert mentions" ON user_mentions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);