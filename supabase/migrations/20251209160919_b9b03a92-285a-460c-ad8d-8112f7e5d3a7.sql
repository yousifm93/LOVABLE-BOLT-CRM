-- Function to calculate P&I for a single lead
CREATE OR REPLACE FUNCTION calculate_principal_interest(
  p_loan_amount numeric,
  p_interest_rate numeric,
  p_term_months integer DEFAULT 360
) RETURNS numeric AS $$
DECLARE
  monthly_rate numeric;
  numerator numeric;
  denominator numeric;
BEGIN
  IF p_loan_amount IS NULL OR p_loan_amount <= 0 OR p_term_months IS NULL OR p_term_months <= 0 THEN
    RETURN 0;
  END IF;
  
  IF p_interest_rate IS NULL OR p_interest_rate <= 0 THEN
    RETURN ROUND(p_loan_amount / p_term_months, 2);
  END IF;
  
  monthly_rate := p_interest_rate / 100.0 / 12.0;
  
  numerator := monthly_rate * POWER(1 + monthly_rate, p_term_months);
  denominator := POWER(1 + monthly_rate, p_term_months) - 1;
  
  RETURN ROUND(p_loan_amount * (numerator / denominator), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Bulk update all leads with P&I calculation
UPDATE leads
SET 
  principal_interest = calculate_principal_interest(loan_amount, interest_rate, COALESCE(term, 360)),
  piti = calculate_principal_interest(loan_amount, interest_rate, COALESCE(term, 360)) 
         + COALESCE(property_taxes, 0) 
         + COALESCE(homeowners_insurance, 0) 
         + COALESCE(mortgage_insurance, 0) 
         + COALESCE(hoa_dues, 0)
WHERE loan_amount > 0 AND interest_rate > 0;