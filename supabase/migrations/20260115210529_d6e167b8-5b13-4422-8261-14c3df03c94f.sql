-- Update Christina Fairbanks and any other Acra Lending contacts (fix company and tags)
UPDATE contacts 
SET company = 'Acra Lending', 
    tags = ARRAY['DSCR', 'Investor Lending', 'Non-QM']
WHERE email ILIKE '%acralending.com%' AND (company IS NULL OR company = '');

-- Populate descriptions from email_contact_suggestions for all existing email-imported contacts
UPDATE contacts c
SET description = ecs.reason,
    email_log_id = ecs.email_log_id
FROM email_contact_suggestions ecs
WHERE c.email = ecs.email 
  AND c.source_type = 'email_import'
  AND ecs.status = 'approved'
  AND c.description IS NULL;