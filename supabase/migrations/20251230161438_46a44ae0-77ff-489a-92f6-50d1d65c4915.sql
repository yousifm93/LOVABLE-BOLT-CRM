-- Create team_feedback table
CREATE TABLE public.team_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_label TEXT NOT NULL,
  feedback_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, section_key)
);

-- Create team_feedback_comments table
CREATE TABLE public.team_feedback_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.team_feedback(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.team_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feedback_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_feedback
CREATE POLICY "Users can view their own feedback"
  ON public.team_feedback FOR SELECT
  USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can insert their own feedback"
  ON public.team_feedback FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update their own feedback"
  ON public.team_feedback FOR UPDATE
  USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Admins can view all feedback"
  ON public.team_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Admin'
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'Admin'
  ));

-- RLS policies for team_feedback_comments
CREATE POLICY "Users can view comments on their feedback"
  ON public.team_feedback_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_feedback tf
    JOIN public.users u ON tf.user_id = u.id
    WHERE tf.id = feedback_id AND u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all comments"
  ON public.team_feedback_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'Admin'
  ));

CREATE POLICY "Admins can insert comments"
  ON public.team_feedback_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'Admin'
  ));

-- Create updated_at trigger for team_feedback
CREATE TRIGGER update_team_feedback_updated_at
  BEFORE UPDATE ON public.team_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();