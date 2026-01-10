-- Add 90% LTV rate columns to daily_market_updates table
ALTER TABLE daily_market_updates
ADD COLUMN rate_30yr_fixed_90ltv numeric,
ADD COLUMN points_30yr_fixed_90ltv numeric,
ADD COLUMN rate_15yr_fixed_90ltv numeric,
ADD COLUMN points_15yr_fixed_90ltv numeric,
ADD COLUMN rate_30yr_fha_90ltv numeric,
ADD COLUMN points_30yr_fha_90ltv numeric,
ADD COLUMN rate_bank_statement_90ltv numeric,
ADD COLUMN points_bank_statement_90ltv numeric;