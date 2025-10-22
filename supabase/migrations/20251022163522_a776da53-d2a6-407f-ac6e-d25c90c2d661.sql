-- First, check and drop any foreign key constraint on buyer_agent_id
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'leads'::regclass 
    AND conname LIKE '%buyer_agent%';
    
    -- Drop if exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Insert the three real estate agents into contacts table (only if they don't exist)
INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Jennifer', 'Martinez', 'jennifer.m@realty.com', '(555) 123-4567', 'Premier Realty Group', 'Agent', 'Excellent referral partner, specializes in luxury market', ARRAY['referral-partner', 'luxury-market']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'jennifer.m@realty.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Robert', 'Chen', 'robert.c@homefinders.com', '(555) 234-5678', 'HomeFinders Real Estate', 'Agent', 'Top producer in commercial lending space', ARRAY['top-producer', 'commercial']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'robert.c@homefinders.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Sarah', 'Thompson', 'sarah.t@coastal.com', '(555) 345-6789', 'Coastal Properties', 'Agent', 'Strong track record in coastal markets', ARRAY['coastal-specialist']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'sarah.t@coastal.com');