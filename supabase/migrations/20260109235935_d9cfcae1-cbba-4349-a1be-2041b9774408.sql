-- Add 70% LTV rate and points columns to daily_market_updates table
ALTER TABLE daily_market_updates
ADD COLUMN rate_30yr_fixed_70ltv numeric,
ADD COLUMN rate_15yr_fixed_70ltv numeric,
ADD COLUMN rate_30yr_fha_70ltv numeric,
ADD COLUMN rate_bank_statement_70ltv numeric,
ADD COLUMN rate_dscr_70ltv numeric,
ADD COLUMN points_30yr_fixed_70ltv numeric,
ADD COLUMN points_15yr_fixed_70ltv numeric,
ADD COLUMN points_30yr_fha_70ltv numeric,
ADD COLUMN points_bank_statement_70ltv numeric,
ADD COLUMN points_dscr_70ltv numeric;