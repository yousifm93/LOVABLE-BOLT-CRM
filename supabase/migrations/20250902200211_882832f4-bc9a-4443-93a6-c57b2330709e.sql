-- Create assistant chat sessions table
CREATE TABLE IF NOT EXISTS public.assistant_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assistant messages table  
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.assistant_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create assistant audit log table
CREATE TABLE IF NOT EXISTS public.assistant_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.assistant_chat_sessions(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  response_summary text,
  tools_called jsonb DEFAULT '[]',
  data_accessed jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all assistant tables
ALTER TABLE public.assistant_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin-only access
CREATE POLICY "Admins can manage assistant chat sessions"
ON public.assistant_chat_sessions
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'Admin'
));

CREATE POLICY "Admins can manage assistant messages"  
ON public.assistant_messages
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'Admin'
));

CREATE POLICY "Admins can view assistant audit log"
ON public.assistant_audit_log  
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'Admin'
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_chat_sessions_user_id ON public.assistant_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_id ON public.assistant_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_user_id ON public.assistant_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_audit_log_created_at ON public.assistant_audit_log(created_at DESC);

-- Add updated_at trigger for sessions
CREATE TRIGGER update_assistant_chat_sessions_updated_at
  BEFORE UPDATE ON public.assistant_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();