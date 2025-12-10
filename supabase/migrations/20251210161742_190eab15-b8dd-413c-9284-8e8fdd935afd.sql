-- Create note_mentions table for @mention functionality
CREATE TABLE IF NOT EXISTS public.note_mentions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    mentioner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_comments table for comments on activity log items
CREATE TABLE IF NOT EXISTS public.activity_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_type TEXT NOT NULL, -- 'call', 'email', 'sms', 'note', 'task', 'status_change'
    activity_id UUID NOT NULL, -- ID of the related activity (call_log_id, email_log_id, note_id, task_id, etc.)
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_mentions
CREATE POLICY "Authenticated users can view note mentions"
ON public.note_mentions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create note mentions"
ON public.note_mentions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update note mentions"
ON public.note_mentions FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- RLS policies for activity_comments
CREATE POLICY "Authenticated users can view activity comments"
ON public.activity_comments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create activity comments"
ON public.activity_comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own activity comments"
ON public.activity_comments FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own activity comments"
ON public.activity_comments FOR DELETE
USING (auth.uid() = author_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_note_mentions_note_id ON public.note_mentions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_mentions_mentioned_user_id ON public.note_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_note_mentions_lead_id ON public.note_mentions(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON public.activity_comments(activity_type, activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_lead_id ON public.activity_comments(lead_id);