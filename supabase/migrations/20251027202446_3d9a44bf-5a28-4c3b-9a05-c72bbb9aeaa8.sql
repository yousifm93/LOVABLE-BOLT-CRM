-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update Yousif's email
UPDATE profiles 
SET email = 'yusufminc@gmail.com' 
WHERE first_name = 'Yousif' OR first_name = 'Yusuf';

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  lead_id UUID REFERENCES leads(id),
  sender_id UUID REFERENCES profiles(user_id),
  recipients JSONB NOT NULL DEFAULT '{}',
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage email logs
CREATE POLICY "Authenticated users can manage email logs"
ON email_logs
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);