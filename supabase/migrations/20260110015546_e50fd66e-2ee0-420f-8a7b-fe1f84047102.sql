-- Add new LTV columns to daily_market_updates table

-- 30-Year Fixed 97% LTV
ALTER TABLE daily_market_updates
ADD COLUMN rate_30yr_fixed_97ltv numeric,
ADD COLUMN points_30yr_fixed_97ltv numeric;

-- 15-Year Fixed 97% LTV
ALTER TABLE daily_market_updates
ADD COLUMN rate_15yr_fixed_97ltv numeric,
ADD COLUMN points_15yr_fixed_97ltv numeric;

-- Bank Statement 75% LTV
ALTER TABLE daily_market_updates
ADD COLUMN rate_bank_statement_75ltv numeric,
ADD COLUMN points_bank_statement_75ltv numeric;

-- DSCR 60% LTV
ALTER TABLE daily_market_updates
ADD COLUMN rate_dscr_60ltv numeric,
ADD COLUMN points_dscr_60ltv numeric;