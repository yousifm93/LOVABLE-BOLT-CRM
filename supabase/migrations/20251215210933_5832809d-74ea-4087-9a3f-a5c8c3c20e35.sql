-- Delete incorrectly imported lender records (addresses, PO boxes, legal clauses)
DELETE FROM lenders 
WHERE lender_name ~ '^\d+\s'  -- Starts with numbers (address)
   OR lender_name ~* '^P\.?O\.?\s*BOX'  -- PO Box
   OR lender_name ~* '^SUITE\s'  -- Suite number
   OR lender_name ~* 'ISAOA'  -- Legal clause
   OR lender_name ~* 'ATIMA'  -- Legal clause
   OR lender_name = 'DBA Lendz Financial'  -- Partial clause
   OR lender_name ~* 'SUCCESSORS'  -- Legal clause
   OR lender_name ~* '^#\d+'  -- Unit number
   OR lender_name ~* '^\w+,\s*[A-Z]{2}\s+\d{5}';  -- City, ST ZIP format