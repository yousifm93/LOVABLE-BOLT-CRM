-- Create pipeline_views table for storing custom view configurations
CREATE TABLE IF NOT EXISTS public.pipeline_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pipeline_type TEXT NOT NULL CHECK (pipeline_type IN ('active', 'leads', 'pending_app', 'screening', 'pre_qualified', 'pre_approved', 'past_clients')),
  column_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_widths JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view pipeline views"
  ON public.pipeline_views
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create pipeline views"
  ON public.pipeline_views
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own pipeline views"
  ON public.pipeline_views
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can delete their own pipeline views"
  ON public.pipeline_views
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_pipeline_views_updated_at
  BEFORE UPDATE ON public.pipeline_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_pipeline_views_pipeline_type ON public.pipeline_views(pipeline_type);
CREATE INDEX idx_pipeline_views_created_by ON public.pipeline_views(created_by);

-- Insert audit log trigger
CREATE TRIGGER pipeline_views_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pipeline_views
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log('system', 'pipeline_views');