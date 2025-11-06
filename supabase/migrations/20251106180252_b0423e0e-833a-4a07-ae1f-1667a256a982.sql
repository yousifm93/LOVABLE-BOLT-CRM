-- Phase 1: Add missing lead fields to crm_fields table
-- This ensures all UI-visible fields have crm_fields entries for column visibility and merge tags

INSERT INTO crm_fields (field_name, display_name, section, field_type, is_visible, is_in_use, is_system_field, sort_order) VALUES
-- Pipeline/Operations Fields
('teammate_assigned', 'Assigned To', 'OPERATIONS', 'select', true, true, false, 100),
('referred_via', 'Referred Via', 'LEAD', 'select', true, true, false, 101),
('referral_source', 'Referral Source', 'LEAD', 'select', true, true, false, 102),
('source', 'Lead Source', 'LEAD', 'select', true, true, false, 103),
('lead_strength', 'Lead Strength', 'LEAD', 'select', true, true, false, 104),
('priority', 'Priority', 'OPERATIONS', 'select', true, true, false, 105),
('arrive_loan_number', 'Arrive Loan Number', 'OPERATIONS', 'number', true, true, false, 106),
('is_closed', 'Is Closed', 'OPERATIONS', 'boolean', true, true, false, 107),

-- Income Fields
('base_employment_income', 'Base Employment Income', 'FINANCIAL', 'currency', true, true, false, 200),
('overtime_income', 'Overtime Income', 'FINANCIAL', 'currency', true, true, false, 201),
('bonus_income', 'Bonus Income', 'FINANCIAL', 'currency', true, true, false, 202),
('self_employment_income', 'Self Employment Income', 'FINANCIAL', 'currency', true, true, false, 203),
('other_income', 'Other Income', 'FINANCIAL', 'currency', true, true, false, 204),
('income_type', 'Income Type', 'FINANCIAL', 'select', true, true, false, 205),

-- Asset Fields
('checking_account', 'Checking Account', 'FINANCIAL', 'currency', true, true, false, 210),
('savings_account', 'Savings Account', 'FINANCIAL', 'currency', true, true, false, 211),
('investment_accounts', 'Investment Accounts', 'FINANCIAL', 'currency', true, true, false, 212),
('retirement_accounts', 'Retirement Accounts', 'FINANCIAL', 'currency', true, true, false, 213),
('gift_funds', 'Gift Funds', 'FINANCIAL', 'currency', true, true, false, 214),
('other_assets', 'Other Assets', 'FINANCIAL', 'currency', true, true, false, 215),

-- Liability Fields
('credit_card_debt', 'Credit Card Debt', 'FINANCIAL', 'currency', true, true, false, 220),
('auto_loans', 'Auto Loans', 'FINANCIAL', 'currency', true, true, false, 221),
('student_loans', 'Student Loans', 'FINANCIAL', 'currency', true, true, false, 222),
('other_monthly_debts', 'Other Monthly Debts', 'FINANCIAL', 'currency', true, true, false, 223),

-- Insurance Fields
('insurance_policy_file', 'Insurance Policy File', 'INSURANCE', 'file', true, true, false, 300),
('insurance_inspection_file', 'Insurance Inspection File', 'INSURANCE', 'file', true, true, false, 301),
('insurance_notes', 'Insurance Notes', 'INSURANCE', 'text', true, true, false, 302),
('insurance_file', 'Insurance File', 'INSURANCE', 'file', true, true, false, 303),

-- Title Fields
('title_file', 'Title File', 'TITLE', 'file', true, true, false, 310),
('title_notes', 'Title Notes', 'TITLE', 'text', true, true, false, 311),
('title_ordered_date', 'Title Ordered Date', 'TITLE', 'date', true, true, false, 312),

-- Condo Fields
('condo_name', 'Condo Name', 'CONDO', 'text', true, true, false, 320),
('condo_docs_file', 'Condo Documents File', 'CONDO', 'file', true, true, false, 321),
('condo_approval_type', 'Condo Approval Type', 'CONDO', 'select', true, true, false, 322),
('condo_notes', 'Condo Notes', 'CONDO', 'text', true, true, false, 323),

-- Date/Timeline Fields
('pending_app_at', 'Pending App Date', 'DATES', 'datetime', true, true, false, 400),
('app_complete_at', 'App Complete Date', 'DATES', 'datetime', true, true, false, 401),
('pre_qualified_at', 'Pre-Qualified Date', 'DATES', 'datetime', true, true, false, 402),
('pre_approved_at', 'Pre-Approved Date', 'DATES', 'datetime', true, true, false, 403),
('active_at', 'Active Date', 'DATES', 'datetime', true, true, false, 404),
('closed_at', 'Closed Date', 'DATES', 'datetime', true, true, false, 405),

-- Payment Breakdown Fields
('monthly_pmt_goal', 'Monthly Payment Goal', 'FINANCIAL', 'currency', true, true, false, 230),
('cash_to_close_goal', 'Cash to Close Goal', 'FINANCIAL', 'currency', true, true, false, 231),
('principal_interest', 'Principal & Interest', 'FINANCIAL', 'currency', true, true, false, 232),
('property_taxes', 'Property Taxes', 'FINANCIAL', 'currency', true, true, false, 233),
('homeowners_insurance', 'Homeowners Insurance', 'FINANCIAL', 'currency', true, true, false, 234),
('mortgage_insurance', 'Mortgage Insurance', 'FINANCIAL', 'currency', true, true, false, 235),
('hoa_dues', 'HOA Dues', 'FINANCIAL', 'currency', true, true, false, 236),
('escrows', 'Escrows', 'FINANCIAL', 'text', true, true, false, 237),

-- Borrower Information Fields
('dob', 'Date of Birth', 'BORROWER', 'date', true, true, false, 500),
('ssn', 'SSN', 'BORROWER', 'text', true, true, false, 501),
('marital_status', 'Marital Status', 'BORROWER', 'select', true, true, false, 502),
('number_of_dependents', 'Number of Dependents', 'BORROWER', 'number', true, true, false, 503),
('time_at_current_address_years', 'Time at Address (Years)', 'BORROWER', 'number', true, true, false, 504),
('time_at_current_address_months', 'Time at Address (Months)', 'BORROWER', 'number', true, true, false, 505),
('military_veteran', 'Military Veteran', 'BORROWER', 'boolean', true, true, false, 506),
('residency_type', 'Residency Type', 'BORROWER', 'select', true, true, false, 507),
('borrower_current_address', 'Current Address', 'BORROWER', 'text', true, true, false, 508),
('own_rent_current_address', 'Own/Rent Current Address', 'BORROWER', 'select', true, true, false, 509),
('middle_name', 'Middle Name', 'BORROWER', 'text', true, true, false, 510),

-- Property Fields
('reo', 'REO Property', 'PROPERTY', 'boolean', true, true, false, 600),

-- Document/File Fields
('contract_file', 'Contract File', 'DOCUMENTS', 'file', true, true, false, 700),
('initial_approval_file', 'Initial Approval File', 'DOCUMENTS', 'file', true, true, false, 701),
('disc_file', 'Disclosure File', 'DOCUMENTS', 'file', true, true, false, 702),
('appraisal_file', 'Appraisal File', 'DOCUMENTS', 'file', true, true, false, 703),
('les_file', 'LES File', 'DOCUMENTS', 'file', true, true, false, 704),
('icd_file', 'ICD File', 'DOCUMENTS', 'file', true, true, false, 705),
('fcp_file', 'FCP File', 'DOCUMENTS', 'file', true, true, false, 706),

-- Metadata Fields
('notes_updated_at', 'Notes Updated At', 'META', 'datetime', false, true, true, 800),
('notes_updated_by', 'Notes Updated By', 'META', 'select', false, true, true, 801),
('latest_file_updates', 'Latest File Updates', 'META', 'text', true, true, false, 802),
('latest_file_updates_updated_at', 'File Updates Updated At', 'META', 'datetime', false, true, true, 803),
('latest_file_updates_updated_by', 'File Updates Updated By', 'META', 'select', false, true, true, 804)
ON CONFLICT (field_name) DO NOTHING;