-- Update Herman Daza with company and tags
UPDATE public.contacts 
SET company = 'Mortgage Bolt', 
    tags = ARRAY['Mortgage', 'Loan Officer']
WHERE id = 'fb126d1f-86fc-4834-bc4b-bccb16789d35';

-- Update Amy Perrella with company and tags
UPDATE public.contacts 
SET company = 'Harvest CREF', 
    tags = ARRAY['Banker', 'Commercial']
WHERE id = '84c94ec5-fa97-45ac-93e4-8f5b0d75aaea';

-- Update Kristina Rothert with company and tags
UPDATE public.contacts 
SET company = 'Advantage Credit', 
    tags = ARRAY['Credit Vendor', 'Credit Report']
WHERE id = 'f7cead81-93d3-4eac-a80e-9ad5f81d5f9b';