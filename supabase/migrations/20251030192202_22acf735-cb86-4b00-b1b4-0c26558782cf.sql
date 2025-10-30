-- Create conversation_history table to store chat sessions
CREATE TABLE IF NOT EXISTS public.conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  title TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  messages JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_history
CREATE POLICY "Users can view their own conversations" 
ON public.conversation_history 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own conversations" 
ON public.conversation_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own conversations" 
ON public.conversation_history 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own conversations" 
ON public.conversation_history 
FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster queries
CREATE INDEX idx_conversation_history_user_id ON public.conversation_history(user_id);
CREATE INDEX idx_conversation_history_session_id ON public.conversation_history(session_id);
CREATE INDEX idx_conversation_history_last_message_at ON public.conversation_history(last_message_at DESC);