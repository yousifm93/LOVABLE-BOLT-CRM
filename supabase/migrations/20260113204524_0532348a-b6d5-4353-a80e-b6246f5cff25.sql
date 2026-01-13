-- Create a function to safely update lead fields including enum types
CREATE OR REPLACE FUNCTION update_lead_field_safe(
  p_lead_id UUID,
  p_field_name TEXT,
  p_field_value TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Use dynamic SQL to handle the update with proper type casting
  EXECUTE format('UPDATE leads SET %I = $1 WHERE id = $2', p_field_name)
  USING p_field_value, p_lead_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- If the direct update fails (e.g., enum mismatch), try with explicit casting
  BEGIN
    EXECUTE format('UPDATE leads SET %I = $1::%s WHERE id = $2', 
      p_field_name, 
      p_field_name)
    USING p_field_value, p_lead_id;
    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;