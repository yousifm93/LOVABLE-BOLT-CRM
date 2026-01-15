-- Update existing "Other" contacts with proper company and tags

-- Update Anastasiya Kamasheva (AD Mortgage)
UPDATE public.contacts 
SET company = 'AD Mortgage', 
    tags = ARRAY['Mortgage', 'Wholesale Lender'],
    lead_created_date = COALESCE(lead_created_date, NOW())
WHERE email = 'anastasiya.kamasheva@admortgage.com';

-- Update Sarah Psiroukis (Lopez Law FL)
UPDATE public.contacts 
SET company = 'Lopez Law FL', 
    tags = ARRAY['Attorney', 'Legal', 'Title'],
    lead_created_date = COALESCE(lead_created_date, NOW())
WHERE email = 'admin2@lopezlawfl.com';

-- Update David Wilson (AD Mortgage)
UPDATE public.contacts 
SET company = 'AD Mortgage', 
    tags = ARRAY['Mortgage', 'Wholesale Lender'],
    lead_created_date = COALESCE(lead_created_date, NOW())
WHERE email = 'david.wilson@admortgage.com';

-- Update Herman Daza 
UPDATE public.contacts 
SET company = COALESCE(company, 'Bolt CRM'),
    tags = COALESCE(tags, ARRAY['Mortgage', 'Loan Officer']),
    lead_created_date = COALESCE(lead_created_date, NOW())
WHERE first_name = 'Herman' AND last_name = 'Daza' AND source_type = 'email_import';

-- Update Amy Perrella (Harvest CREF)
UPDATE public.contacts 
SET company = COALESCE(company, 'Harvest CREF'),
    tags = COALESCE(tags, ARRAY['Banker', 'Commercial']),
    lead_created_date = COALESCE(lead_created_date, NOW())
WHERE first_name = 'Amy' AND last_name = 'Perrella';

-- Update Kristina Rothert (Advantage Credit)
UPDATE public.contacts 
SET company = COALESCE(company, 'Advantage Credit'),
    tags = COALESCE(tags, ARRAY['Credit Vendor', 'Credit Report']),
    lead_created_date = COALESCE(lead_created_date, NOW())
WHERE first_name = 'Kristina' AND last_name = 'Rothert';

-- Set lead_created_date to today for all contacts without it
UPDATE public.contacts
SET lead_created_date = NOW()
WHERE lead_created_date IS NULL AND source_type = 'email_import';