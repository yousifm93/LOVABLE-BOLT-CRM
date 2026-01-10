-- Add new LTV columns for DSCR, Bank Statement, and FHA
ALTER TABLE daily_market_updates
-- DSCR: Add 75% and 85% LTV
ADD COLUMN rate_dscr_75ltv numeric,
ADD COLUMN points_dscr_75ltv numeric,
ADD COLUMN rate_dscr_85ltv numeric,
ADD COLUMN points_dscr_85ltv numeric,
-- Bank Statement: Add 85% LTV
ADD COLUMN rate_bank_statement_85ltv numeric,
ADD COLUMN points_bank_statement_85ltv numeric,
-- FHA: Add 96.5% LTV
ADD COLUMN rate_30yr_fha_965ltv numeric,
ADD COLUMN points_30yr_fha_965ltv numeric;