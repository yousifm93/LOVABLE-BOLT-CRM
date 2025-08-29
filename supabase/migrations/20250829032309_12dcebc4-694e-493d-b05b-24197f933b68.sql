-- Update task_status enum to include user's requested statuses
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'Working on it';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'Need help';

-- Create a function to format dates in modern format
CREATE OR REPLACE FUNCTION format_date_modern(input_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF input_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN UPPER(TO_CHAR(input_date, 'MON')) || ' ' || TO_CHAR(input_date, 'DD');
END;
$$;