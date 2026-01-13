CREATE OR REPLACE FUNCTION update_lead_field_safe(
  p_lead_id UUID,
  p_field_name TEXT,
  p_field_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual_type TEXT;
BEGIN
  -- First, try direct update (works for most types)
  EXECUTE format('UPDATE leads SET %I = $1 WHERE id = $2', p_field_name)
  USING p_field_value, p_lead_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- If direct update fails, look up the actual column type
  SELECT udt_name INTO actual_type
  FROM information_schema.columns
  WHERE table_name = 'leads' AND column_name = p_field_name;
  
  IF actual_type IS NULL THEN
    RAISE EXCEPTION 'Column % does not exist in leads table', p_field_name;
  END IF;
  
  -- Try with explicit casting to the actual type
  BEGIN
    EXECUTE format('UPDATE leads SET %I = $1::%s WHERE id = $2', 
      p_field_name, 
      actual_type)
    USING p_field_value, p_lead_id;
    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
END;
$$;