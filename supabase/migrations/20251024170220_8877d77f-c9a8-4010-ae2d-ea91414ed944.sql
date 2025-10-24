-- Add system/computed fields to crm_fields table for centralized management
-- These are fields that are computed in the UI but should be visible in Admin panel

INSERT INTO crm_fields (field_name, display_name, section, field_type, is_required, is_visible, is_system_field, is_in_use, sort_order, validation_rules) VALUES
-- Display/Computed Fields (names and relationships)
('borrower_name', 'Borrower Name', 'SYSTEM', 'computed', false, true, true, true, 1001, '{"computed_from": ["first_name", "last_name"], "formula": "first_name + last_name"}'::jsonb),
('team', 'Team Member', 'SYSTEM', 'computed', false, true, true, true, 1003, '{"computed_from": ["teammate_assigned"], "displays": "user_full_name"}'::jsonb),
('real_estate_agent', 'Buyer Agent', 'SYSTEM', 'computed', false, true, true, true, 1006, '{"computed_from": ["buyer_agent_id"], "displays": "agent_full_name"}'::jsonb),
('listing_agent', 'Listing Agent', 'SYSTEM', 'computed', false, true, true, true, 1007, '{"computed_from": ["listing_agent_id"], "displays": "agent_full_name"}'::jsonb),
('lender', 'Lender', 'SYSTEM', 'computed', false, true, true, true, 1008, '{"computed_from": ["approved_lender_id"], "displays": "lender_name"}'::jsonb),

-- Timestamp Fields (transformed for display)
('createdOn', 'Lead Created On', 'SYSTEM', 'computed', false, true, true, true, 1010, '{"computed_from": ["created_at"], "transforms": "date_display"}'::jsonb),
('pendingAppOn', 'Pending App On', 'SYSTEM', 'computed', false, true, true, true, 1011, '{"computed_from": ["pending_app_at"], "transforms": "date_display"}'::jsonb),
('appCompleteOn', 'App Complete On', 'SYSTEM', 'computed', false, true, true, true, 1012, '{"computed_from": ["app_complete_at"], "transforms": "date_display"}'::jsonb),
('preQualifiedOn', 'Pre-Qualified On', 'SYSTEM', 'computed', false, true, true, true, 1013, '{"computed_from": ["pre_qualified_at"], "transforms": "date_display"}'::jsonb),
('preApprovedOn', 'Pre-Approved On', 'SYSTEM', 'computed', false, true, true, true, 1014, '{"computed_from": ["pre_approved_at"], "transforms": "date_display"}'::jsonb),

-- Aliases for cleaner display
('loanNumber', 'Loan Number', 'SYSTEM', 'computed', false, true, true, true, 1030, '{"computed_from": ["arrive_loan_number"], "alias": true}'::jsonb)

ON CONFLICT (field_name) DO NOTHING;