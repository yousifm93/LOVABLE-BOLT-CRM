-- Create enums for income calculator
CREATE TYPE doc_type AS ENUM (
  'pay_stub',
  'w2', 
  'form_1099',
  'form_1040',
  'schedule_c',
  'schedule_e', 
  'schedule_f',
  'k1',
  'form_1065',
  'form_1120s',
  'voe'
);

CREATE TYPE ocr_status AS ENUM ('pending', 'processing', 'success', 'failed');
CREATE TYPE agency_type AS ENUM ('fannie', 'freddie', 'fha', 'va', 'usda', 'nonqm');
CREATE TYPE pay_frequency AS ENUM ('weekly', 'biweekly', 'semimonthly', 'monthly');
CREATE TYPE component_type AS ENUM (
  'base_hourly',
  'base_salary', 
  'overtime',
  'bonus',
  'commission',
  'self_employed',
  'rental',
  'other'
);
CREATE TYPE audit_step AS ENUM (
  'upload',
  'ocr',
  'classify', 
  'parse',
  'validate',
  'calculate',
  'export'
);

-- Create borrowers table (extending existing leads concept)
CREATE TABLE public.borrowers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  ssn_last4 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create income_documents table
CREATE TABLE public.income_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  doc_type doc_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  page_count INTEGER DEFAULT 1,
  ocr_status ocr_status NOT NULL DEFAULT 'pending',
  parsed_json JSONB,
  parse_confidence NUMERIC(3,2),
  doc_period_start DATE,
  doc_period_end DATE,
  ytd_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create income_calculations table  
CREATE TABLE public.income_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  agency agency_type NOT NULL,
  calc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result_monthly_income NUMERIC(12,2),
  confidence NUMERIC(3,2),
  warnings JSONB DEFAULT '[]'::jsonb,
  overrides JSONB DEFAULT '{}'::jsonb,
  inputs_version TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create income_components table
CREATE TABLE public.income_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_id UUID NOT NULL REFERENCES public.income_calculations(id) ON DELETE CASCADE,
  component_type component_type NOT NULL,
  monthly_amount NUMERIC(12,2) NOT NULL,
  calculation_method TEXT,
  months_considered INTEGER,
  source_documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_events table for income calculator
CREATE TABLE public.income_audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calculation_id UUID REFERENCES public.income_calculations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.income_documents(id) ON DELETE CASCADE,
  step audit_step NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create provider_configs table
CREATE TABLE public.provider_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage borrowers in their account" ON public.borrowers
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage income documents for their borrowers" ON public.income_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.borrowers b 
      WHERE b.id = income_documents.borrower_id 
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can manage income calculations for their borrowers" ON public.income_calculations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.borrowers b 
      WHERE b.id = income_calculations.borrower_id 
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can view income components for their calculations" ON public.income_components
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.income_calculations ic
      JOIN public.borrowers b ON b.id = ic.borrower_id
      WHERE ic.id = income_components.calculation_id 
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can view audit events for their data" ON public.income_audit_events
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view provider configs" ON public.provider_configs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage provider configs" ON public.provider_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'Admin'
    )
  );

-- Create storage bucket for income documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('income-docs', 'income-docs', false);

-- Create storage policies
CREATE POLICY "Users can upload income documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'income-docs' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view their income documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'income-docs' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their income documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'income-docs' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their income documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'income-docs' 
    AND auth.uid() IS NOT NULL
  );

-- Add update triggers
CREATE TRIGGER update_borrowers_updated_at
  BEFORE UPDATE ON public.borrowers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_documents_updated_at
  BEFORE UPDATE ON public.income_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_calculations_updated_at
  BEFORE UPDATE ON public.income_calculations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_configs_updated_at
  BEFORE UPDATE ON public.provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default agency rules configuration
INSERT INTO public.provider_configs (config_key, config_value) VALUES 
('rules_agency_v1', '{
  "fannie": {
    "overtime": {
      "required_months": 12,
      "declining_threshold": 0.1
    },
    "bonus": {
      "required_months": 24,
      "declining_threshold": 0.1
    },
    "commission": {
      "required_months": 24,
      "declining_threshold": 0.1
    },
    "self_employed": {
      "required_years": 2,
      "averaging_months": 24,
      "addbacks": ["depreciation", "depletion"]
    },
    "rental": {
      "vacancy_factor": 0.75,
      "addbacks": ["depreciation", "mortgage_interest", "taxes", "insurance"]
    }
  },
  "freddie": {
    "overtime": {
      "required_months": 12,
      "declining_threshold": 0.1
    },
    "bonus": {
      "required_months": 24,
      "declining_threshold": 0.1
    },
    "commission": {
      "required_months": 24,
      "declining_threshold": 0.1
    },
    "self_employed": {
      "required_years": 2,
      "averaging_months": 24,
      "addbacks": ["depreciation", "depletion"]
    },
    "rental": {
      "vacancy_factor": 0.75,
      "addbacks": ["depreciation", "mortgage_interest", "taxes", "insurance"]
    }
  },
  "fha": {
    "overtime": {
      "required_months": 12,
      "declining_threshold": 0.2
    },
    "bonus": {
      "required_months": 12,
      "declining_threshold": 0.2
    },
    "commission": {
      "required_months": 12,
      "declining_threshold": 0.2
    },
    "self_employed": {
      "required_years": 2,
      "averaging_months": 24,
      "addbacks": ["depreciation", "depletion", "home_office"]
    },
    "rental": {
      "vacancy_factor": 0.75,
      "addbacks": ["depreciation", "mortgage_interest", "taxes", "insurance"]
    }
  },
  "va": {
    "overtime": {
      "required_months": 12,
      "declining_threshold": 0.15
    },
    "bonus": {
      "required_months": 12,
      "declining_threshold": 0.15
    },
    "commission": {
      "required_months": 12,
      "declining_threshold": 0.15
    },
    "self_employed": {
      "required_years": 2,
      "averaging_months": 24,
      "addbacks": ["depreciation", "depletion"]
    },
    "rental": {
      "vacancy_factor": 0.75,
      "addbacks": ["depreciation", "mortgage_interest", "taxes", "insurance"]
    }
  },
  "usda": {
    "overtime": {
      "required_months": 12,
      "declining_threshold": 0.1
    },
    "bonus": {
      "required_months": 24,
      "declining_threshold": 0.1
    },
    "commission": {
      "required_months": 24,
      "declining_threshold": 0.1
    },
    "self_employed": {
      "required_years": 2,
      "averaging_months": 24,
      "addbacks": ["depreciation", "depletion"]
    },
    "rental": {
      "vacancy_factor": 0.75,
      "addbacks": ["depreciation", "mortgage_interest", "taxes", "insurance"]
    }
  }
}');

-- Insert OCR provider configuration
INSERT INTO public.provider_configs (config_key, config_value) VALUES 
('ocr_providers', '{
  "primary": "openai",
  "fallback": "tesseract",
  "openai": {
    "model": "gpt-4o",
    "max_tokens": 4000
  },
  "aws_textract": {
    "region": "us-east-1"
  },
  "google_vision": {
    "features": ["TEXT_DETECTION", "DOCUMENT_TEXT_DETECTION"]
  }
}');