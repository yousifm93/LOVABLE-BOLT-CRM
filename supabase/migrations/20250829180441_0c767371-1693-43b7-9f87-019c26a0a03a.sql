-- Add pipeline section field to leads table
ALTER TABLE public.leads 
ADD COLUMN pipeline_section text DEFAULT 'Live' CHECK (pipeline_section IN ('Live', 'Incoming', 'On Hold'));

-- Create condos table
CREATE TABLE public.condos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condo_name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  area TEXT,
  budget_file_url TEXT,
  cq_file_url TEXT,
  mip_file_url TEXT,
  approval_expiration_date DATE,
  approval_source approval_source_type,
  approval_type approval_type_type,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval source enum
CREATE TYPE approval_source_type AS ENUM ('PennyMac', 'A&D', 'UWM');

-- Create approval type enum  
CREATE TYPE approval_type_type AS ENUM ('Full', 'Limited', 'Non-QM', 'Hard Money');

-- Update condos table to use the enums
ALTER TABLE public.condos 
ALTER COLUMN approval_source TYPE approval_source_type USING approval_source::approval_source_type,
ALTER COLUMN approval_type TYPE approval_type_type USING approval_type::approval_type_type;

-- Enable RLS on condos table
ALTER TABLE public.condos ENABLE ROW LEVEL SECURITY;

-- Create policies for condos
CREATE POLICY "Anyone can manage condos" 
ON public.condos 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates on condos
CREATE TRIGGER update_condos_updated_at
BEFORE UPDATE ON public.condos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for condo documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('condo-documents', 'condo-documents', false);

-- Create storage policies for condo documents
CREATE POLICY "Authenticated users can upload condo documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'condo-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view condo documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'condo-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update condo documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'condo-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete condo documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'condo-documents' AND auth.uid() IS NOT NULL);