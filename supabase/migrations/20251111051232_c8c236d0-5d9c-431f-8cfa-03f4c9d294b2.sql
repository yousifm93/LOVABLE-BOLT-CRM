-- Add timestamp tracking fields for loan status changes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ctc_at TIMESTAMPTZ;

-- Create function to automatically track loan status timestamps
CREATE OR REPLACE FUNCTION track_loan_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Track when loan is submitted (SUB)
  IF NEW.loan_status = 'SUB' AND OLD.loan_status IS DISTINCT FROM 'SUB' THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- Track when loan reaches Clear to Close (CTC)
  IF NEW.loan_status = 'CTC' AND OLD.loan_status IS DISTINCT FROM 'CTC' THEN
    NEW.ctc_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on loan status updates
DROP TRIGGER IF EXISTS track_loan_status_changes ON leads;
CREATE TRIGGER track_loan_status_changes
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_loan_status_timestamps();