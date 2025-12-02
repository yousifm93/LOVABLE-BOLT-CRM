-- Change mb_loan_number type from integer to text to support MB- prefix format
ALTER TABLE leads ALTER COLUMN mb_loan_number TYPE TEXT;