-- Update field type to currency for proper formatting
UPDATE public.crm_fields 
SET field_type = 'currency'
WHERE field_name = 'down_pmt';

-- Update email template to remove manual $ prefix (now handled by formatting)
UPDATE public.email_templates
SET html = REPLACE(html, '${{down_pmt}}', '{{down_pmt}}'),
    version = version + 1,
    updated_at = now()
WHERE name = 'Loan Pre-Qualification';