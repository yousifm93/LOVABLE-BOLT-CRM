-- Insert seed data for the MortgageBolt CRM

-- Insert seed data for buyer_agents (only if table is empty)
INSERT INTO public.buyer_agents (first_name, last_name, email, phone, brokerage, license_number, years_experience)
SELECT 'Sarah', 'Martinez', 'sarah.martinez@realtycorp.com', '(555) 123-4567', 'Realty Corp', 'RE12345678', 8
WHERE NOT EXISTS (SELECT 1 FROM public.buyer_agents)
UNION ALL
SELECT 'Michael', 'Johnson', 'michael.johnson@primeproperties.com', '(555) 234-5678', 'Prime Properties', 'RE23456789', 12
WHERE NOT EXISTS (SELECT 1 FROM public.buyer_agents)
UNION ALL  
SELECT 'Emily', 'Chen', 'emily.chen@coastalrealty.com', '(555) 345-6789', 'Coastal Realty', 'RE34567890', 5
WHERE NOT EXISTS (SELECT 1 FROM public.buyer_agents)
UNION ALL
SELECT 'David', 'Rodriguez', 'david.rodriguez@metrogroup.com', '(555) 456-7890', 'Metro Group', 'RE45678901', 15
WHERE NOT EXISTS (SELECT 1 FROM public.buyer_agents)
UNION ALL
SELECT 'Jessica', 'Thompson', 'jessica.thompson@elitehomes.com', '(555) 567-8901', 'Elite Homes', 'RE56789012', 7
WHERE NOT EXISTS (SELECT 1 FROM public.buyer_agents);