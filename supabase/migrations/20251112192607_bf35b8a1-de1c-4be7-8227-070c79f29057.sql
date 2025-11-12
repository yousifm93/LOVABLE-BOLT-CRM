-- Add missing UI fields to crm_fields table
INSERT INTO crm_fields (
  field_name, display_name, section, field_type, 
  is_required, is_visible, is_system_field, is_in_use, 
  sort_order, description
) VALUES
-- DATE fields (sort_order 2100-2106)
('appraisal_ordered_date', 'Appraisal Ordered Date', 'DATE', 'date', false, true, false, true, 2100, 'The date the appraisal was ordered'),
('appraisal_scheduled_date', 'Appraisal Scheduled Date', 'DATE', 'date', false, true, false, true, 2101, 'The date the appraisal inspection is scheduled'),
('insurance_quoted_date', 'Insurance Quoted Date', 'DATE', 'date', false, true, false, true, 2102, 'The date insurance was quoted'),
('insurance_ordered_date', 'Insurance Ordered Date', 'DATE', 'date', false, true, false, true, 2103, 'The date insurance was ordered'),
('insurance_received_date', 'Insurance Received Date', 'DATE', 'date', false, true, false, true, 2104, 'The date insurance policy was received'),
('submitted_at', 'Submitted On', 'DATE', 'datetime', false, true, false, true, 2105, 'The date the loan was submitted to underwriting'),
('ctc_at', 'Clear to Close On', 'DATE', 'datetime', false, true, false, true, 2106, 'The date the loan received clear to close'),

-- OBJECT fields (sort_order 3100-3103)
('buyer_agent_id', 'Buyer''s Agent', 'OBJECT', 'agent', false, true, false, true, 3100, 'The real estate agent representing the buyer'),
('listing_agent_id', 'Listing Agent', 'OBJECT', 'agent', false, true, false, true, 3101, 'The real estate agent representing the seller'),
('lender_id', 'Lender', 'OBJECT', 'lender', false, true, false, true, 3102, 'The lending institution for the loan'),
('approved_lender_id', 'Approved Lender', 'OBJECT', 'approved_lender', false, true, false, true, 3103, 'The approved lender for this loan'),

-- NOTES field (sort_order 4100)
('appraisal_notes', 'Appraisal Notes', 'NOTES', 'text', false, true, false, true, 4100, 'Notes about the appraisal process'),

-- CONTACT INFO field (sort_order 100)
('phone', 'Phone', 'CONTACT INFO', 'phone', false, true, false, true, 100, 'Primary phone number')
ON CONFLICT (field_name) DO NOTHING;