-- Add prepayment_penalty and dscr_ratio fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prepayment_penalty text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dscr_ratio numeric;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rate_lock_file text;