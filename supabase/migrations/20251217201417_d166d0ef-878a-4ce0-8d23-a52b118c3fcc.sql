-- Add points columns to daily_market_updates
ALTER TABLE daily_market_updates
ADD COLUMN IF NOT EXISTS points_30yr_fixed numeric,
ADD COLUMN IF NOT EXISTS points_15yr_fixed numeric,
ADD COLUMN IF NOT EXISTS points_30yr_fha numeric,
ADD COLUMN IF NOT EXISTS points_bank_statement numeric,
ADD COLUMN IF NOT EXISTS points_dscr numeric;

-- Add scenario_type to pricing_runs to track what each run is for
ALTER TABLE pricing_runs
ADD COLUMN IF NOT EXISTS scenario_type text;