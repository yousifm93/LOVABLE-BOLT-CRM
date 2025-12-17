UPDATE daily_market_updates 
SET rate_bank_statement = 6.750, points_bank_statement = 99.616, updated_at = NOW()
WHERE date = CURRENT_DATE;