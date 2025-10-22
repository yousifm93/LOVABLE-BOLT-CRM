-- Insert 12 real estate agents into contacts table
INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Joel', 'Matus', 'joel@williamsislandrealty.com', '305-409-0000', 'Williams Island Realty, LLC', 'Agent', 'License DRE#02451892, specializes in luxury waterfront properties. Active deals: 8, Total volume: $12.5M', ARRAY['luxury', 'waterfront']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'joel@williamsislandrealty.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Omar', 'Ariza', 'omar.ariza@urbanresource.com', '571-330-7989', 'Urban Resource LLC', 'Agent', 'License DRE#02398745, urban development specialist. Active deals: 5, Total volume: $8.3M', ARRAY['urban', 'development']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'omar.ariza@urbanresource.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Carlos', 'Cordoba', 'carlos.cordoba@urbanresource.com', '786-328-3305', 'Urban Resource LLC', 'Agent', 'License DRE#02334567, commercial and residential specialist. Active deals: 6, Total volume: $9.7M', ARRAY['commercial', 'residential']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'carlos.cordoba@urbanresource.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Magaly', 'Annichiarico', 'magalylindao@yahoo.com', '786-580-0239', 'Unlimited Real Estate Corp.', 'Agent', 'License DRE#02267891, bilingual specialist (English/Spanish). Active deals: 4, Total volume: $5.2M', ARRAY['bilingual', 'first-time-buyers']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'magalylindao@yahoo.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Claudia', 'Peña', 'claudiapena@thekeyes.com', '786-555-9999', 'The Keyes Company', 'Agent', 'License DRE#02189234, investment properties and rental specialist. Active deals: 7, Total volume: $6.8M', ARRAY['investment', 'rentals']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'claudiapena@thekeyes.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Jorge', 'Paez', 'jorgepaezrealestate@gmail.com', '786-398-8601', 'The Keyes Company', 'Agent', 'License DRE#02445678, luxury homes specialist. Active deals: 9, Total volume: $15.2M', ARRAY['luxury', 'estates']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'jorgepaezrealestate@gmail.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Federico', 'Resini', 'federicore@bellsouth.net', '786-487-7174', 'The Keyes Company', 'Agent', 'License DRE#02312890, condo and downtown specialist. Active deals: 5, Total volume: $4.9M', ARRAY['condos', 'downtown']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'federicore@bellsouth.net');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Sergio', 'Gonzalez', 'sergiogonzalez.realtor@gmail.com', '786-216-3792', 'The Keyes Company', 'Agent', 'License DRE#02278901, family homes and school district specialist. Active deals: 6, Total volume: $7.4M', ARRAY['family-homes', 'schools']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'sergiogonzalez.realtor@gmail.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Juan', 'Zapata', 'juanzapa8@gmail.com', '786-333-7947', 'The City Agency, Inc.', 'Agent', 'License DRE#02156734, commercial properties and investment specialist. Active deals: 8, Total volume: $11.3M', ARRAY['commercial', 'investment']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'juanzapa8@gmail.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Francis', 'Beracha', 'TheBerachaTeam@gmail.com', '305-798-6300', 'The Beracha Team LLC', 'Agent', 'License DRE#02423456, team leader, luxury market specialist. Active deals: 12, Total volume: $18.7M', ARRAY['luxury', 'team-leader']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'TheBerachaTeam@gmail.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Carlos', 'Aragon Jr.', 'ca.aragongroup@gmail.com', '786-205-1381', 'The Aragon Group Intl Corp', 'Agent', 'License DRE#02367812, international properties specialist. Active deals: 7, Total volume: $10.5M', ARRAY['international', 'investment']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'ca.aragongroup@gmail.com');

INSERT INTO contacts (first_name, last_name, email, phone, company, type, notes, tags)
SELECT 'Fanny', 'Gonzalez', 'fanny.gonzalez.properties@outlook.com', '786-873-5692', 'The Agency Florida', 'Agent', 'License DRE#02291567, waterfront and luxury specialist. Active deals: 6, Total volume: $9.2M', ARRAY['waterfront', 'luxury']
WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'fanny.gonzalez.properties@outlook.com');