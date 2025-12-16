-- Add lender marketing detection columns to email_logs
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS is_lender_marketing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lender_marketing_category text;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_email_logs_lender_marketing 
ON public.email_logs(is_lender_marketing) 
WHERE is_lender_marketing = true;