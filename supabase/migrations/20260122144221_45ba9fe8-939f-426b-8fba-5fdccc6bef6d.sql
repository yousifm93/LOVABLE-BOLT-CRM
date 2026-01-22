-- Add show_in_lead_details column to email_templates to control visibility in lead details page
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS show_in_lead_details BOOLEAN DEFAULT true;