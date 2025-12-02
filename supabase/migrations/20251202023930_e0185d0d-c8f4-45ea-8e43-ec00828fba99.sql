-- Create real_estate_properties table
CREATE TABLE IF NOT EXISTS public.real_estate_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_address text NOT NULL,
  property_type text,
  property_usage text,
  property_value numeric,
  monthly_expenses numeric,
  monthly_rent numeric,
  net_income numeric GENERATED ALWAYS AS (COALESCE(monthly_rent, 0) - COALESCE(monthly_expenses, 0)) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.real_estate_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage REO for their account leads"
  ON public.real_estate_properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = real_estate_properties.lead_id
        AND leads.account_id = get_user_account_id(auth.uid())
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_real_estate_properties_updated_at
  BEFORE UPDATE ON public.real_estate_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update own_rent_current_address CRM field to include "Living Rent-Free"
UPDATE public.crm_fields
SET dropdown_options = '["RENT", "OWN", "Living Rent-Free"]'::jsonb
WHERE field_name = 'own_rent_current_address';