-- Add description column to crm_fields table
ALTER TABLE public.crm_fields 
ADD COLUMN IF NOT EXISTS description text;

-- Add helpful comment
COMMENT ON COLUMN public.crm_fields.description IS 'User-friendly description explaining what this field is used for, visible in Admin UI and available for email template documentation';