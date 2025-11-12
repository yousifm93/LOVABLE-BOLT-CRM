-- Update all 113 field sections to match the new organizational structure
-- and add concise descriptions for fields missing them

-- ADDRESS (5 fields)
UPDATE crm_fields SET section = 'ADDRESS' WHERE field_name IN (
  'subject_address_1', 'subject_address_2', 'subject_city', 'subject_state', 'subject_zip'
);

-- BORROWER INFO (16 fields)
UPDATE crm_fields SET section = 'BORROWER INFO' WHERE field_name IN (
  'marital_status', 'own_rent_current_address', 'reo', 'military_veteran', 'search_stage',
  'assets', 'borrower_current_address', 'cash_to_close_goal', 'dti', 'fico_score',
  'income_type', 'monthly_liabilities', 'monthly_pmt_goal', 'residency_status', 'ssn',
  'total_monthly_income'
);

-- CONTACT INFO (6 fields) - Fix "CONTACT NFO" typo
UPDATE crm_fields SET section = 'CONTACT INFO' WHERE field_name IN (
  'first_name', 'last_name', 'borrower_name', 'borrower_phone', 'email', 'middle_name'
);

-- DATE (28 fields)
UPDATE crm_fields SET section = 'DATE' WHERE field_name IN (
  'active_at', 'app_complete_at', 'appCompleteOn', 'appr_date_time', 'appr_eta',
  'close_date', 'closed_at', 'createdOn', 'dob', 'fin_cont',
  'latest_file_updates_updated_at', 'lock_expiration_date', 'notes_updated_at',
  'pending_app_at', 'pendingAppOn', 'pre_approved_at', 'pre_qualified_at',
  'preApprovedOn', 'preQualifiedOn', 'title_eta', 'title_ordered_date',
  'appraisal_ordered_date', 'appraisal_scheduled_date', 'insurance_quoted_date',
  'insurance_ordered_date', 'insurance_received_date', 'submitted_at', 'ctc_at'
);

-- FILE (12 fields)
UPDATE crm_fields SET section = 'FILE' WHERE field_name IN (
  'appraisal_file', 'condo_docs_file', 'contract_file', 'disc_file', 'fcp_file',
  'icd_file', 'initial_approval_file', 'insurance_file', 'insurance_inspection_file',
  'insurance_policy_file', 'les_file', 'title_file'
);

-- LEAD INFO (7 fields)
UPDATE crm_fields SET section = 'LEAD INFO' WHERE field_name IN (
  'referral_source', 'referred_via', 'converted', 'lead_strength', 'likely_to_apply',
  'priority', 'source'
);

-- LOAN INFO (22 fields)
UPDATE crm_fields SET section = 'LOAN INFO' WHERE field_name IN (
  'appraisal_value', 'arrive_loan_number', 'condo_approval_type', 'down_pmt', 'escrows',
  'hoa_dues', 'homeowners_insurance', 'interest_rate', 'lender_loan_number', 'loan_amount',
  'loan_type', 'loanNumber', 'mortgage_insurance', 'occupancy', 'piti',
  'principal_interest', 'program', 'property_taxes', 'property_type', 'sales_price', 'term',
  'condo_name'
);

-- LOAN STATUS (11 fields)
UPDATE crm_fields SET section = 'LOAN STATUS' WHERE field_name IN (
  'appraisal_status', 'ba_status', 'cd_status', 'condo_status', 'disclosure_status',
  'epo_status', 'hoi_status', 'loan_status', 'mi_status', 'package_status', 'title_status'
);

-- NOTES (5 fields)
UPDATE crm_fields SET section = 'NOTES' WHERE field_name IN (
  'condo_notes', 'insurance_notes', 'notes', 'title_notes', 'appraisal_notes'
);

-- OBJECT (10 fields)
UPDATE crm_fields SET section = 'OBJECT' WHERE field_name IN (
  'condo_id', 'lender', 'listing_agent', 'real_estate_agent', 'team', 'teammate_assigned',
  'buyer_agent_id', 'approved_lender_id', 'lender_id', 'listing_agent_id'
);

-- TRACKING DATA (13 fields)
UPDATE crm_fields SET section = 'TRACKING DATA' WHERE field_name IN (
  'is_closed', 'latest_file_updates', 'latest_file_updates_updated_by', 'notes_updated_by',
  'account_id', 'created_at', 'updated_at', 'created_by', 'pipeline_section', 
  'pipeline_stage_id', 'task_eta', 'lead_on_date', 'status'
);

-- Add concise descriptions for fields missing them

-- BORROWER INFO descriptions
UPDATE crm_fields SET description = 'Borrower marital status' WHERE field_name = 'marital_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Military or veteran status' WHERE field_name = 'military_veteran' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Borrower current residential address' WHERE field_name = 'borrower_current_address' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Target cash required at closing' WHERE field_name = 'cash_to_close_goal' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Type of income documentation' WHERE field_name = 'income_type' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Target monthly mortgage payment' WHERE field_name = 'monthly_pmt_goal' AND (description IS NULL OR description = '');

-- CONTACT INFO descriptions
UPDATE crm_fields SET description = 'Borrower first name' WHERE field_name = 'first_name' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Borrower last name' WHERE field_name = 'last_name' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Computed full name (first + last)' WHERE field_name = 'borrower_name' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Borrower middle name' WHERE field_name = 'middle_name' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Primary email address' WHERE field_name = 'email' AND (description IS NULL OR description = '');

-- DATE descriptions
UPDATE crm_fields SET description = 'The date the lead became active' WHERE field_name = 'active_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date the application was completed' WHERE field_name = 'app_complete_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Formatted display of app completion date' WHERE field_name = 'appCompleteOn' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Scheduled date and time for appraisal' WHERE field_name = 'appr_date_time' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Estimated date for appraisal completion' WHERE field_name = 'appr_eta' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Scheduled closing date' WHERE field_name = 'close_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date the loan closed' WHERE field_name = 'closed_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Formatted display of lead creation date' WHERE field_name = 'createdOn' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Borrower date of birth' WHERE field_name = 'dob' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Financing contingency deadline date' WHERE field_name = 'fin_cont' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Timestamp when file updates were last modified' WHERE field_name = 'latest_file_updates_updated_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Date when the interest rate lock expires' WHERE field_name = 'lock_expiration_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Timestamp when notes were last modified' WHERE field_name = 'notes_updated_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date the lead became pending application' WHERE field_name = 'pending_app_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Formatted display of pending app date' WHERE field_name = 'pendingAppOn' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Formatted display of pre-approval date' WHERE field_name = 'preApprovedOn' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Formatted display of pre-qualified date' WHERE field_name = 'preQualifiedOn' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date appraisal was ordered' WHERE field_name = 'appraisal_ordered_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date appraisal was scheduled' WHERE field_name = 'appraisal_scheduled_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date insurance was quoted' WHERE field_name = 'insurance_quoted_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date insurance was ordered' WHERE field_name = 'insurance_ordered_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date insurance documents were received' WHERE field_name = 'insurance_received_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date loan was submitted to underwriting' WHERE field_name = 'submitted_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'The date clear to close was received' WHERE field_name = 'ctc_at' AND (description IS NULL OR description = '');

-- FILE descriptions (use display name)
UPDATE crm_fields SET description = 'Appraisal File' WHERE field_name = 'appraisal_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Condo Documents File' WHERE field_name = 'condo_docs_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Contract File' WHERE field_name = 'contract_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Disclosures File' WHERE field_name = 'disc_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Final Closing Package File' WHERE field_name = 'fcp_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Initial Closing Disclosure File' WHERE field_name = 'icd_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Initial Approval File' WHERE field_name = 'initial_approval_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Insurance File' WHERE field_name = 'insurance_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Insurance Inspection File' WHERE field_name = 'insurance_inspection_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Insurance Policy File' WHERE field_name = 'insurance_policy_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Loan Estimate File' WHERE field_name = 'les_file' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Notes about the appraisal' WHERE field_name = 'appraisal_notes' AND (description IS NULL OR description = '');

-- LEAD INFO descriptions
UPDATE crm_fields SET description = 'Source of the referral' WHERE field_name = 'referral_source' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Method of referral contact' WHERE field_name = 'referred_via' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Current lead conversion status' WHERE field_name = 'converted' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Lead quality rating' WHERE field_name = 'lead_strength' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Probability of submitting application' WHERE field_name = 'likely_to_apply' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Original lead source' WHERE field_name = 'source' AND (description IS NULL OR description = '');

-- LOAN INFO descriptions
UPDATE crm_fields SET description = 'Appraised property value' WHERE field_name = 'appraisal_value' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Internal loan tracking number' WHERE field_name = 'arrive_loan_number' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Type of condo approval required' WHERE field_name = 'condo_approval_type' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Down payment amount or percentage' WHERE field_name = 'down_pmt' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Property tax and insurance escrow status' WHERE field_name = 'escrows' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Interest rate percentage' WHERE field_name = 'interest_rate' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Loan amount requested' WHERE field_name = 'loan_amount' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Purchase, refinance, or HELOC' WHERE field_name = 'loan_type' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Computed alias for arrive_loan_number' WHERE field_name = 'loanNumber' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Condo or HOA name' WHERE field_name = 'condo_name' AND (description IS NULL OR description = '');

-- LOAN STATUS descriptions
UPDATE crm_fields SET description = 'Current status of appraisal process' WHERE field_name = 'appraisal_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Borrower authorization status' WHERE field_name = 'ba_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Closing disclosure status' WHERE field_name = 'cd_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Condo approval process status' WHERE field_name = 'condo_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Initial disclosure status' WHERE field_name = 'disclosure_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Equal Payment Obligation status' WHERE field_name = 'epo_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Homeowners insurance status' WHERE field_name = 'hoi_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Overall loan progress status' WHERE field_name = 'loan_status' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Mortgage insurance status' WHERE field_name = 'mi_status' AND (description IS NULL OR description = '');

-- NOTES descriptions
UPDATE crm_fields SET description = 'Notes about condo approval' WHERE field_name = 'condo_notes' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Notes about insurance' WHERE field_name = 'insurance_notes' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'General notes about the borrower' WHERE field_name = 'notes' AND (description IS NULL OR description = '');

-- OBJECT descriptions
UPDATE crm_fields SET description = 'Computed display of lender name' WHERE field_name = 'lender' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Computed display of listing agent name' WHERE field_name = 'listing_agent' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Computed display of buyer agent name' WHERE field_name = 'real_estate_agent' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Reference to buyer agent contact' WHERE field_name = 'buyer_agent_id' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Reference to approved lender contact' WHERE field_name = 'approved_lender_id' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Reference to lender contact' WHERE field_name = 'lender_id' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Reference to listing agent contact' WHERE field_name = 'listing_agent_id' AND (description IS NULL OR description = '');

-- TRACKING DATA descriptions
UPDATE crm_fields SET description = 'Whether the lead is closed' WHERE field_name = 'is_closed' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Latest file update notes' WHERE field_name = 'latest_file_updates' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'User who last updated file notes' WHERE field_name = 'latest_file_updates_updated_by' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'User who last updated notes' WHERE field_name = 'notes_updated_by' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Account this lead belongs to' WHERE field_name = 'account_id' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Timestamp when lead was created' WHERE field_name = 'created_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Timestamp when lead was last updated' WHERE field_name = 'updated_at' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'User who created this lead' WHERE field_name = 'created_by' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Current pipeline section' WHERE field_name = 'pipeline_section' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Current pipeline stage reference' WHERE field_name = 'pipeline_stage_id' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Estimated task completion date' WHERE field_name = 'task_eta' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Date lead was initially created' WHERE field_name = 'lead_on_date' AND (description IS NULL OR description = '');
UPDATE crm_fields SET description = 'Current lead status' WHERE field_name = 'status' AND (description IS NULL OR description = '');

-- Update timestamp for all modified records
UPDATE crm_fields SET updated_at = now() WHERE is_in_use = true;