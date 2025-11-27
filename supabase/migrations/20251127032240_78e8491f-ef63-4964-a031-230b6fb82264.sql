-- Add co-borrower fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS co_borrower_first_name text,
ADD COLUMN IF NOT EXISTS co_borrower_last_name text,
ADD COLUMN IF NOT EXISTS co_borrower_email text,
ADD COLUMN IF NOT EXISTS co_borrower_phone text,
ADD COLUMN IF NOT EXISTS co_borrower_relationship text;

-- Add time at address fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS time_at_current_address_years integer,
ADD COLUMN IF NOT EXISTS time_at_current_address_months integer;

-- Add declaration fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS decl_primary_residence boolean,
ADD COLUMN IF NOT EXISTS decl_ownership_interest boolean,
ADD COLUMN IF NOT EXISTS decl_seller_affiliation boolean,
ADD COLUMN IF NOT EXISTS decl_borrowing_undisclosed boolean;

-- Add demographic fields
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS demographic_ethnicity text,
ADD COLUMN IF NOT EXISTS demographic_race text,
ADD COLUMN IF NOT EXISTS demographic_gender text;

-- Insert CRM field entries for co-borrower fields
INSERT INTO public.crm_fields (field_name, display_name, section, field_type, is_system_field, sort_order, description)
VALUES 
  ('co_borrower_first_name', 'Co-Borrower First Name', 'co_borrower_info', 'text', false, 200, 'Co-borrower first name'),
  ('co_borrower_last_name', 'Co-Borrower Last Name', 'co_borrower_info', 'text', false, 201, 'Co-borrower last name'),
  ('co_borrower_email', 'Co-Borrower Email', 'co_borrower_info', 'text', false, 202, 'Co-borrower email address'),
  ('co_borrower_phone', 'Co-Borrower Phone', 'co_borrower_info', 'phone', false, 203, 'Co-borrower phone number'),
  ('co_borrower_relationship', 'Co-Borrower Relationship', 'co_borrower_info', 'text', false, 204, 'Relationship to borrower')
ON CONFLICT (field_name) DO NOTHING;

-- Insert CRM field entries for time at address
INSERT INTO public.crm_fields (field_name, display_name, section, field_type, is_system_field, sort_order, description)
VALUES
  ('time_at_current_address_years', 'Years at Current Address', 'borrower_info', 'number', false, 150, 'Years at current address'),
  ('time_at_current_address_months', 'Months at Current Address', 'borrower_info', 'number', false, 151, 'Months at current address')
ON CONFLICT (field_name) DO NOTHING;

-- Insert CRM field entries for declarations
INSERT INTO public.crm_fields (field_name, display_name, section, field_type, is_system_field, sort_order, description)
VALUES
  ('decl_primary_residence', 'Will Occupy as Primary Residence', 'declarations', 'boolean', false, 300, 'Declaration: Will occupy as primary residence'),
  ('decl_ownership_interest', 'Have Ownership Interest in Other Property', 'declarations', 'boolean', false, 301, 'Declaration: Have ownership interest in another property'),
  ('decl_seller_affiliation', 'Related to Seller/Real Estate Agent', 'declarations', 'boolean', false, 302, 'Declaration: Related to seller or real estate agent'),
  ('decl_borrowing_undisclosed', 'Borrowing Money for Down Payment', 'declarations', 'boolean', false, 303, 'Declaration: Borrowing money for down payment')
ON CONFLICT (field_name) DO NOTHING;

-- Insert CRM field entries for demographics
INSERT INTO public.crm_fields (field_name, display_name, section, field_type, is_system_field, sort_order, description)
VALUES
  ('demographic_ethnicity', 'Ethnicity', 'demographics', 'text', false, 400, 'Borrower ethnicity'),
  ('demographic_race', 'Race', 'demographics', 'text', false, 401, 'Borrower race'),
  ('demographic_gender', 'Gender', 'demographics', 'text', false, 402, 'Borrower gender')
ON CONFLICT (field_name) DO NOTHING;