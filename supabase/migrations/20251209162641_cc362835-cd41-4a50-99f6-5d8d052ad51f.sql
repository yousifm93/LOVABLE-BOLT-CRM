-- Add discount_points_percentage field to store percentage value
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS discount_points_percentage numeric;

-- Normalize existing loan program data to title case (keeping acronyms uppercase)
UPDATE leads SET program = 'Conventional' WHERE LOWER(TRIM(program)) IN ('conventional', 'conventonal', 'conv');
UPDATE leads SET program = 'FHA' WHERE LOWER(TRIM(program)) IN ('fha');
UPDATE leads SET program = 'VA' WHERE LOWER(TRIM(program)) IN ('va');
UPDATE leads SET program = 'USDA' WHERE LOWER(TRIM(program)) IN ('usda');
UPDATE leads SET program = 'DSCR' WHERE LOWER(TRIM(program)) IN ('dscr');
UPDATE leads SET program = 'Jumbo' WHERE LOWER(TRIM(program)) IN ('jumbo');
UPDATE leads SET program = 'Non-QM' WHERE LOWER(TRIM(program)) IN ('non-qm', 'nonqm', 'non qm');
UPDATE leads SET program = 'Bank Statement' WHERE LOWER(TRIM(program)) IN ('bank statement', 'bankstatement');