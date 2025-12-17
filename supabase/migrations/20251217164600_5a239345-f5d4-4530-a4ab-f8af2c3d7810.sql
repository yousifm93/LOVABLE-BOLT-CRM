-- Create email_comments table for internal email comments
CREATE TABLE email_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_uid INTEGER NOT NULL,
  email_folder TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies: team members can read and insert comments
CREATE POLICY "Team members can read email comments" 
ON email_comments FOR SELECT 
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert email comments" 
ON email_comments FOR INSERT 
WITH CHECK (public.is_team_member(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Team members can delete own comments" 
ON email_comments FOR DELETE 
USING (public.is_team_member(auth.uid()) AND auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_email_comments_uid_folder ON email_comments(email_uid, email_folder);