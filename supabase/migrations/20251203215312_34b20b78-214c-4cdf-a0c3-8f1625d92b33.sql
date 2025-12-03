-- Add finance_contingency date field to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS finance_contingency DATE;

-- Add to crm_fields for admin visibility
INSERT INTO public.crm_fields (field_name, display_name, description, section, field_type, is_required, is_visible, is_system_field, is_in_use, sort_order)
VALUES ('finance_contingency', 'Finance Contingency', 'Finance contingency deadline date', 'DATES', 'date', false, true, false, true, 150)
ON CONFLICT (field_name) DO UPDATE SET display_name = 'Finance Contingency', is_in_use = true;