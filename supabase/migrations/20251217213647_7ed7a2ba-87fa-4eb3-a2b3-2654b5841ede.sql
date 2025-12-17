-- Create custom_email_categories table for user-defined email categories
CREATE TABLE public.custom_email_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL DEFAULT 'CheckCircle',
  color TEXT NOT NULL DEFAULT 'text-gray-500',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_email_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view custom email categories"
ON public.custom_email_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage custom email categories"
ON public.custom_email_categories
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Seed with the existing 4 categories
INSERT INTO public.custom_email_categories (name, key, icon_name, color, sort_order) VALUES
  ('Needs Attention', 'needs_attention', 'AlertCircle', 'text-amber-500', 1),
  ('Reviewed - File', 'reviewed_file', 'CheckCircle', 'text-green-500', 2),
  ('Reviewed - Lender Mktg', 'reviewed_lender_marketing', 'CheckCircle', 'text-blue-500', 3),
  ('Reviewed - N/A', 'reviewed_na', 'CheckCircle', 'text-gray-500', 4);

-- Create index for sort order
CREATE INDEX idx_custom_email_categories_sort ON public.custom_email_categories(sort_order);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_email_categories_updated_at
BEFORE UPDATE ON public.custom_email_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();