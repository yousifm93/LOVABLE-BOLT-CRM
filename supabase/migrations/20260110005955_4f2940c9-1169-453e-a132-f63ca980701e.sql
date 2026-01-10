-- Add 95% LTV columns (3 scenarios: 30yr fixed, 15yr fixed, FHA - no bank statement or DSCR)
ALTER TABLE daily_market_updates
ADD COLUMN IF NOT EXISTS rate_30yr_fixed_95ltv numeric,
ADD COLUMN IF NOT EXISTS points_30yr_fixed_95ltv numeric,
ADD COLUMN IF NOT EXISTS rate_15yr_fixed_95ltv numeric,
ADD COLUMN IF NOT EXISTS points_15yr_fixed_95ltv numeric,
ADD COLUMN IF NOT EXISTS rate_30yr_fha_95ltv numeric,
ADD COLUMN IF NOT EXISTS points_30yr_fha_95ltv numeric;