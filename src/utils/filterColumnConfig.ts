// Shared filter column configurations for all pipeline pages
// Each field has proper type (text, select, date, number) and options for select fields

export type FilterColumnType = 'text' | 'select' | 'date' | 'number';

export interface FilterColumn {
  value: string;
  label: string;
  type: FilterColumnType;
  options?: string[];
}

// Status options for various fields
export const STATUS_OPTIONS = {
  converted: ['Pending App', 'App Complete', 'Standby', 'DNA'],
  screeningStatus: ['Just Applied', 'Screening', 'Pre-Qualified', 'Standby'],
  preQualifiedStatus: ['Pre-Qualified', 'Pre-Approved', 'Standby', 'DNA'],
  preApprovedStatus: ['Pre-Approved', 'Active', 'Standby', 'DNA'],
  loanType: ['Purchase', 'Refinance', 'Cash Out Refinance', 'HELOC', 'Construction', 'VA Loan', 'FHA Loan', 'Conventional', 'Jumbo'],
  propertyType: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', '2-4 Units', 'Other'],
  occupancy: ['Primary Residence', 'Second Home', 'Investment'],
  disclosureStatus: ['Ordered', 'Sent', 'Signed', 'Need SIG'],
  loanStatus: ['New', 'RFP', 'SUB', 'AWC', 'CTC'],
  appraisalStatus: ['Ordered', 'Scheduled', 'Inspected', 'Received', 'Waiver', 'Transfer', 'On Hold'],
  titleStatus: ['Requested', 'Received'],
  hoiStatus: ['Quoted', 'Ordered', 'Bound'],
  condoStatus: ['Ordered', 'Docs Received', 'Approved', 'Transfer', 'On Hold', 'N/A'],
  cdStatus: ['Requested', 'Sent', 'Signed', 'N/A'],
  packageStatus: ['Initial', 'Final'],
  baStatus: ['Send', 'Sent', 'Signed', 'N/A'],
  epoStatus: ['Pending', 'Sent', 'Completed'],
  prType: ['P', 'R', 'HELOC'],
  leadStrength: ['Hot', 'Warm', 'Cold'],
  likelyToApply: ['Very Likely', 'Likely', 'Unlikely', 'Very Unlikely'],
  referralSource: ['Real Estate Agent', 'Past Client', 'Online', 'Other'],
  referredVia: ['Email', 'Text Message', 'Phone', 'In Person', 'Other'],
  priority: ['High', 'Medium', 'Low'],
  taskStatus: ['pending', 'in_progress', 'completed', 'cancelled'],
  taskCategory: ['marketing', 'lead_status', 'active_loan', 'past_client'],
};

// Common filter columns for Leads/Pending App pipeline
export const LEADS_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'converted', label: 'Status', type: 'select', options: STATUS_OPTIONS.converted },
  { value: 'loan_type', label: 'Loan Type', type: 'select', options: STATUS_OPTIONS.loanType },
  { value: 'loan_amount', label: 'Loan Amount', type: 'number' },
  { value: 'fico_score', label: 'Credit Score', type: 'number' },
  { value: 'lead_strength', label: 'Lead Strength', type: 'select', options: STATUS_OPTIONS.leadStrength },
  { value: 'likely_to_apply', label: 'Likely to Apply', type: 'select', options: STATUS_OPTIONS.likelyToApply },
  { value: 'referral_source', label: 'Referral Source', type: 'select', options: STATUS_OPTIONS.referralSource },
  { value: 'referred_via', label: 'Referred Via', type: 'select', options: STATUS_OPTIONS.referredVia },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'pending_app_at', label: 'Pending App Date', type: 'date' },
  { value: 'task_eta', label: 'Due Date', type: 'date' },
];

// Screening filter columns
export const SCREENING_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'converted', label: 'Status', type: 'select', options: STATUS_OPTIONS.screeningStatus },
  { value: 'loan_type', label: 'Loan Type', type: 'select', options: STATUS_OPTIONS.loanType },
  { value: 'loan_amount', label: 'Loan Amount', type: 'number' },
  { value: 'sales_price', label: 'Sales Price', type: 'number' },
  { value: 'fico_score', label: 'Credit Score', type: 'number' },
  { value: 'dti', label: 'DTI', type: 'number' },
  { value: 'property_type', label: 'Property Type', type: 'select', options: STATUS_OPTIONS.propertyType },
  { value: 'occupancy', label: 'Occupancy', type: 'select', options: STATUS_OPTIONS.occupancy },
  { value: 'app_complete_at', label: 'App Complete Date', type: 'date' },
  { value: 'task_eta', label: 'Due Date', type: 'date' },
];

// Pre-Qualified filter columns
export const PRE_QUALIFIED_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'converted', label: 'Status', type: 'select', options: STATUS_OPTIONS.preQualifiedStatus },
  { value: 'loan_type', label: 'Loan Type', type: 'select', options: STATUS_OPTIONS.loanType },
  { value: 'loan_amount', label: 'Loan Amount', type: 'number' },
  { value: 'sales_price', label: 'Sales Price', type: 'number' },
  { value: 'fico_score', label: 'Credit Score', type: 'number' },
  { value: 'dti', label: 'DTI', type: 'number' },
  { value: 'property_type', label: 'Property Type', type: 'select', options: STATUS_OPTIONS.propertyType },
  { value: 'pre_qualified_at', label: 'Pre-Qualified Date', type: 'date' },
  { value: 'task_eta', label: 'Due Date', type: 'date' },
];

// Pre-Approved filter columns
export const PRE_APPROVED_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'converted', label: 'Status', type: 'select', options: STATUS_OPTIONS.preApprovedStatus },
  { value: 'loan_type', label: 'Loan Type', type: 'select', options: STATUS_OPTIONS.loanType },
  { value: 'loan_amount', label: 'Loan Amount', type: 'number' },
  { value: 'sales_price', label: 'Sales Price', type: 'number' },
  { value: 'fico_score', label: 'Credit Score', type: 'number' },
  { value: 'dti', label: 'DTI', type: 'number' },
  { value: 'property_type', label: 'Property Type', type: 'select', options: STATUS_OPTIONS.propertyType },
  { value: 'pre_approved_at', label: 'Pre-Approved Date', type: 'date' },
  { value: 'task_eta', label: 'Due Date', type: 'date' },
];

// Active pipeline filter columns
export const ACTIVE_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'mb_loan_number', label: 'Loan Number', type: 'text' },
  { value: 'disclosure_status', label: 'Disclosure Status', type: 'select', options: STATUS_OPTIONS.disclosureStatus },
  { value: 'loan_status', label: 'Loan Status', type: 'select', options: STATUS_OPTIONS.loanStatus },
  { value: 'appraisal_status', label: 'Appraisal Status', type: 'select', options: STATUS_OPTIONS.appraisalStatus },
  { value: 'title_status', label: 'Title Status', type: 'select', options: STATUS_OPTIONS.titleStatus },
  { value: 'hoi_status', label: 'HOI Status', type: 'select', options: STATUS_OPTIONS.hoiStatus },
  { value: 'condo_status', label: 'Condo Status', type: 'select', options: STATUS_OPTIONS.condoStatus },
  { value: 'cd_status', label: 'CD Status', type: 'select', options: STATUS_OPTIONS.cdStatus },
  { value: 'package_status', label: 'Package Status', type: 'select', options: STATUS_OPTIONS.packageStatus },
  { value: 'ba_status', label: 'BA Status', type: 'select', options: STATUS_OPTIONS.baStatus },
  { value: 'epo_status', label: 'EPO Status', type: 'select', options: STATUS_OPTIONS.epoStatus },
  { value: 'pr_type', label: 'P/R Type', type: 'select', options: STATUS_OPTIONS.prType },
  { value: 'loan_amount', label: 'Loan Amount', type: 'number' },
  { value: 'close_date', label: 'Close Date', type: 'date' },
  { value: 'lock_expiration_date', label: 'Lock Expiration', type: 'date' },
];

// Past Clients filter columns
export const PAST_CLIENTS_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'phone', label: 'Phone', type: 'text' },
  { value: 'mb_loan_number', label: 'Loan Number', type: 'text' },
  { value: 'loan_type', label: 'Loan Type', type: 'select', options: STATUS_OPTIONS.loanType },
  { value: 'loan_amount', label: 'Loan Amount', type: 'number' },
  { value: 'close_date', label: 'Close Date', type: 'date' },
  { value: 'closed_at', label: 'Closed Date', type: 'date' },
];

// Tasks filter columns
export const TASKS_FILTER_COLUMNS: FilterColumn[] = [
  { value: 'title', label: 'Task Name', type: 'text' },
  { value: 'description', label: 'Description', type: 'text' },
  { value: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS.taskStatus },
  { value: 'priority', label: 'Priority', type: 'select', options: STATUS_OPTIONS.priority },
  { value: 'category', label: 'Category', type: 'select', options: STATUS_OPTIONS.taskCategory },
  { value: 'due_date', label: 'Due Date', type: 'date' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
];
