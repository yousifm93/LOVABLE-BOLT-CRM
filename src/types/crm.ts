// Unified CRM data model for Mortgage Bolt
export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneMobile?: string;
  phone?: string;
  phoneAlt?: string;
  avatar?: string;
  title?: string;
  company?: string;
}

export interface Loan {
  loanNumber?: string;
  loanAmount: string | number;
  salesPrice?: string | number;
  loanProgram?: string;
  prType: string;
  occupancy?: string;
  lender?: string;
  lenderName?: string;
  closeDate?: string;
  disclosureStatus?: string;
  interestRate?: string;
  loanType: string;
  downPayment?: string;
  term?: number;
}

export interface Operations {
  stage: PipelineStage;
  team?: string;
  agent?: string;
  connected?: boolean;
  lastTouch?: string;
  lastFollowUp?: string;
  taskEta?: string;
  referralSource?: string;
  referredVia?: string;
  priority?: "High" | "Medium" | "Low";
  status: string;
}

export interface Dates {
  leadOn?: string;
  createdOn: string;
  pendingAppOn?: string;
  appliedOn?: string;
  prequalifiedOn?: string;
  preapprovedOn?: string;
  activeOn?: string;
  closedOn?: string;
}

export interface MetaData {
  notes?: string;
  taskOrder?: number;
  tags?: string[];
  documents?: Document[];
  activities?: Activity[];
  tasks?: Task[];
}

export interface CRMClient {
  person: Person;
  loan: Loan;
  property?: {
    propertyType?: string;
  };
  ops: Operations;
  dates: Dates;
  meta: MetaData;
  // Database ID (UUID) from Supabase
  databaseId?: string;
  // Legacy fields for compatibility
  name: string;
  creditScore?: number;
  dti?: number;
  incomeType?: string;
  progress?: number;
  nextStep?: string;
  satisfaction?: string;
  referrals?: number;
  approvedAmount?: string;
  qualifiedAmount?: string;
  lockStatus?: string;
  expirationDate?: string;
  screeningDate?: string;
  qualifiedDate?: string;
  loanOfficer?: string;
  processor?: string;
  underwriter?: string;
  closingDate?: string;
  daysToClosing?: number;
  lastContact?: string;
  
  // Enhanced fields for all pipeline stages
  leadOnDate?: string;
  pendingAppOnDate?: string;
  buyersAgent?: string;
  referredVia?: 'Phone' | 'Email' | 'Social Media' | 'Personal' | string;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  teammateAssigned?: 'Yousif' | 'Salma' | 'Herman Daza' | string;
  buyersAgreement?: 'signed' | 'pending' | 'not_applicable';
  buyer_agent_id?: string | null;
  buyer_agent?: any;
  
  // All additional fields from database
  middleName?: string;
  buyersAgentId?: string | null;
  listingAgent?: any;
  listingAgentId?: string | null;
  user?: string;
  referralSource?: string;
  dueDate?: string;
  
  // Loan details
  principalInterest?: number;
  propertyTaxes?: number;
  homeownersInsurance?: number;
  mortgageInsurance?: number;
  hoaDues?: number;
  piti?: number;
  escrows?: string;
  loanProgram?: string;
  term?: number;
  interestRate?: number;
  
  // Property details
  subjectAddress1?: string;
  subjectAddress2?: string;
  subjectCity?: string;
  subjectState?: string;
  subjectZip?: string;
  appraisalValue?: string;
  
  // Borrower info
  dateOfBirth?: string;
  currentAddress?: string;
  ownRentCurrentAddress?: string;
  timeAtAddressYears?: number;
  timeAtAddressMonths?: number;
  militaryVeteran?: boolean;
  reo?: boolean;
  
  // Financial
  totalMonthlyIncome?: number;
  monthlyLiabilities?: number;
  assets?: number;
  downPayment?: string;
  
  // Timelines
  pendingAppOn?: string;
  appCompleteAt?: string;
  preQualifiedAt?: string;
  preApprovedAt?: string;
  lockExpirationDate?: string;
  leadDate?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Process statuses
  disclosureStatus?: string;
  loanStatus?: string;
  appraisalStatus?: string;
  titleStatus?: string;
  hoiStatus?: string;
  condoStatus?: string;
  cdStatus?: string;
  packageStatus?: string;
  baStatus?: string;
  epoStatus?: string;
  miStatus?: string;
  
  // Documents
  lesFile?: string;
  contractFile?: string;
  initialApprovalFile?: string;
  discFile?: string;
  appraisalFile?: string;
  insuranceFile?: string;
  icdFile?: string;
  fcpFile?: string;
  
  // Additional
  pipelineStageId?: string;
  pipelineSection?: string;
  mbLoanNumber?: string;
  prType?: string;
  source?: string;
  leadStrength?: string;
  isClosed?: boolean;
  searchStage?: string;
  titleEta?: string;
  appraisalDateTime?: string;
  appraisalEta?: string;
  financingContingency?: string;
  monthlyPmtGoal?: number;
  cashToCloseGoal?: number;
  followUpCount?: number;
  
  // Co-Borrower Information
  coBorrowerFirstName?: string;
  coBorrowerLastName?: string;
  coBorrowerEmail?: string;
  coBorrowerPhone?: string;
  coBorrowerRelationship?: string;
  
  // Declarations
  declPrimaryResidence?: boolean;
  declOwnershipInterest?: boolean;
  declSellerAffiliation?: boolean;
  declBorrowingUndisclosed?: boolean;
  
  // Demographics
  demographicEthnicity?: string;
  demographicRace?: string;
  demographicGender?: string;
}

export type PipelineStage = 'leads' | 'pending-app' | 'screening' | 'pre-qualified' | 'pre-approved' | 'active' | 'past-clients' | 'incoming' | 'rfp' | 'submitted' | 'awc' | 'ctc' | 'closing';

// Status dropdown options for each stage
export type LeadStatus = "working_on_it" | "pending_app" | "nurture" | "dead" | "need_attention";
export type PendingAppStatus = "new" | "pending_app" | "app_complete" | "on_hold" | "dna";
export type ScreeningStatus = "just_applied" | "screening" | "pending_docs" | "pre_qualified" | "stand_by";
export type PreQualifiedStatus = "new" | "shopping" | "offers_out" | "ready_for_preapproval";
export type PreApprovedStatus = "new" | "shopping" | "offers_out" | "under_contract" | "ready_to_proceed";
export type ActiveStatus = "incoming" | "rfp" | "submitted" | "awc" | "ctc" | "closing";
export type PastClientStatus = "placeholder1" | "placeholder2" | "placeholder3" | "placeholder4";

export interface Document {
  id: number;
  name: string;
  type: string;
  uploadDate: string;
  url: string;
  size: string;
}

export interface Activity {
  id: number;
  type: 'call' | 'email' | 'sms' | 'note' | 'task' | 'document' | 'stage_change';
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  metadata?: Record<string, any>;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  assignee?: string;
  priority?: "High" | "Medium" | "Low";
  clientId?: number;
}

export interface Agent {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  company: string;
  licenseNumber?: string;
  specializations?: string[];
  activeDeals: number;
  totalVolume: string;
  status: "Active" | "Inactive";
  lastContact?: string;
  notes?: string;
}

export interface Contact {
  id: number;
  type: 'agent' | 'borrower' | 'referral';
  person: Person;
  relationship?: string;
  source?: string;
  status: "Active" | "Inactive" | "Prospect";
  tags?: string[];
  notes?: string;
  lastContact?: string;
  deals?: number;
}

// Stage configuration
export const PIPELINE_STAGES = [
  { key: 'leads' as const, label: 'Lead', number: 1, color: 'bg-muted' },
  { key: 'pending-app' as const, label: 'Pending App', number: 2, color: 'bg-info' },
  { key: 'screening' as const, label: 'Screening', number: 3, color: 'bg-warning' },
  { key: 'pre-qualified' as const, label: 'Pre-Qualified', number: 4, color: 'bg-primary' },
  { key: 'pre-approved' as const, label: 'Pre-Approved', number: 5, color: 'bg-success' },
  { key: 'active' as const, label: 'Active', number: 6, color: 'bg-accent' },
  { key: 'past-clients' as const, label: 'Past Clients', number: 7, color: 'bg-secondary' },
] as const;

// Pipeline configurations for different stages
export const PIPELINE_CONFIGS = {
  leads: [
    { key: 'leads', label: 'Leads', icon: '📞' },
    { key: 'pending-app', label: 'Pending App', icon: '📄' },
    { key: 'screening', label: 'Screening', icon: '🔍' },
    { key: 'pre-qualified', label: 'Pre-Qualified', icon: '✅' },
    { key: 'pre-approved', label: 'Pre-Approved', icon: '🎯' },
    { key: 'active', label: 'Active', icon: '🚀' }
  ],
  active: [
    { key: 'incoming', label: 'NEW', icon: '📥' },
    { key: 'rfp', label: 'RFP', icon: '🏃' },
    { key: 'submitted', label: 'SUB', icon: '📨' },
    { key: 'awc', label: 'AWC', icon: '⚠️' },
    { key: 'ctc', label: 'CTC', icon: '🔓' }
  ],
  'past-clients': [
    { key: 'closed', label: 'Closed', icon: '✅' },
    { key: 'needs-support', label: 'Needs Support', icon: '🆘' },
    { key: 'new-lead', label: 'New Lead', icon: '🔄' }
  ]
} as const;

export const TEAM_MEMBERS = [
  'Yousif',
  'Salma', 
  'Herman Daza'
] as const;

// Complete database field name to frontend display key mapping (all 124+ fields)
export const FIELD_NAME_MAP: Record<string, string> = {
  // CONTACT INFO
  'first_name': 'firstName',
  'last_name': 'lastName',
  'middle_name': 'middleName',
  'email': 'email',
  'phone': 'phone',
  
  // BORROWER INFO
  'marital_status': 'maritalStatus',
  'own_rent_current_address': 'ownRentCurrentAddress',
  'reo': 'reo',
  'military_veteran': 'militaryVeteran',
  'search_stage': 'searchStage',
  'assets': 'assets',
  'borrower_current_address': 'borrowerCurrentAddress',
  'cash_to_close_goal': 'cashToCloseGoal',
  'dti': 'dti',
  'fico_score': 'creditScore',
  'income_type': 'incomeType',
  'monthly_liabilities': 'monthlyLiabilities',
  'monthly_pmt_goal': 'monthlyPmtGoal',
  'last_follow_up_date': 'lastFollowUpDate',
  'follow_up_count': 'followUpCount',
  'residency_type': 'residencyType',
  'ssn': 'ssn',
  'total_monthly_income': 'totalMonthlyIncome',
  'dob': 'dateOfBirth',
  'time_at_current_address_years': 'timeAtCurrentAddressYears',
  'time_at_current_address_months': 'timeAtCurrentAddressMonths',
  
  // CO-BORROWER INFO
  'co_borrower_first_name': 'coBorrowerFirstName',
  'co_borrower_last_name': 'coBorrowerLastName',
  'co_borrower_email': 'coBorrowerEmail',
  'co_borrower_phone': 'coBorrowerPhone',
  'co_borrower_relationship': 'coBorrowerRelationship',
  
  // DECLARATIONS
  'decl_primary_residence': 'declPrimaryResidence',
  'decl_ownership_interest': 'declOwnershipInterest',
  'decl_seller_affiliation': 'declSellerAffiliation',
  'decl_borrowing_undisclosed': 'declBorrowingUndisclosed',
  
  // DEMOGRAPHICS
  'demographic_ethnicity': 'demographicEthnicity',
  'demographic_race': 'demographicRace',
  'demographic_gender': 'demographicGender',
  
  // LEAD INFO
  'referral_source': 'referralSource',
  'referred_via': 'referredVia',
  'converted': 'status',
  'lead_strength': 'leadStrength',
  'likely_to_apply': 'likelyToApply',
  'priority': 'priority',
  'source': 'source',
  
  // LOAN INFO
  'appraisal_value': 'appraisalValue',
  'mb_loan_number': 'mbLoanNumber',
  'loan_amount': 'loanAmount',
  'sales_price': 'salesPrice',
  'loan_type': 'loanType',
  'property_type': 'propertyType',
  'interest_rate': 'interestRate',
  'term': 'term',
  'piti': 'piti',
  'principal_interest': 'principalInterest',
  'property_taxes': 'propertyTaxes',
  'homeowners_insurance': 'homeownersInsurance',
  'mortgage_insurance': 'mortgageInsurance',
  'hoa_dues': 'hoaDues',
  'program': 'loanProgram',
  'down_pmt': 'downPayment',
  'escrows': 'escrows',
  'occupancy': 'occupancy',
  'lender_loan_number': 'lenderLoanNumber',
  'closing_costs': 'closingCosts',
  'cash_to_close': 'cashToClose',
  'condo_name': 'condoName',
  'condo_approval_type': 'condoApprovalType',
  
  // OBJECT (relationship fields)
  'buyer_agent_id': 'buyerAgentId',
  'listing_agent_id': 'listingAgentId',
  'lender_id': 'lenderId',
  'approved_lender_id': 'approvedLenderId',
  'teammate_assigned': 'teammateAssigned',
  'condo_id': 'condoId',
  
  // DATE
  'lead_on_date': 'leadOnDate',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'task_eta': 'taskEta',
  'close_date': 'closeDate',
  'lock_expiration_date': 'lockExpirationDate',
  'title_eta': 'titleEta',
  'appr_date_time': 'appraisalDateTime',
  'appr_eta': 'appraisalEta',
  'fin_cont': 'financingContingency',
  'finance_contingency': 'financeContingency',
  'pending_app_at': 'pendingAppAt',
  'app_complete_at': 'appCompleteAt',
  'pre_qualified_at': 'preQualifiedAt',
  'pre_approved_at': 'preApprovedAt',
  'active_at': 'activeAt',
  'closed_at': 'closedAt',
  'submitted_at': 'submittedAt',
  'ctc_at': 'ctcAt',
  'title_ordered_date': 'titleOrderedDate',
  'appraisal_ordered_date': 'appraisalOrderedDate',
  'appraisal_scheduled_date': 'appraisalScheduledDate',
  'insurance_quoted_date': 'insuranceQuotedDate',
  'insurance_ordered_date': 'insuranceOrderedDate',
  'insurance_received_date': 'insuranceReceivedDate',
  'notes_updated_at': 'notesUpdatedAt',
  'latest_file_updates_updated_at': 'latestFileUpdatesUpdatedAt',
  
  // LOAN STATUS
  'appraisal_status': 'appraisalStatus',
  'title_status': 'titleStatus',
  'hoi_status': 'hoiStatus',
  'condo_status': 'condoStatus',
  'cd_status': 'cdStatus',
  'disclosure_status': 'disclosureStatus',
  'loan_status': 'loanStatus',
  'package_status': 'packageStatus',
  'ba_status': 'baStatus',
  'epo_status': 'epoStatus',
  'mi_status': 'miStatus',
  
  // NOTES
  'notes': 'notes',
  'condo_notes': 'condoNotes',
  'insurance_notes': 'insuranceNotes',
  'title_notes': 'titleNotes',
  'appraisal_notes': 'appraisalNotes',
  'latest_file_updates': 'latestFileUpdates',
  
  // FILE
  'appraisal_file': 'appraisalFile',
  'condo_docs_file': 'condoDocsFile',
  'contract_file': 'contractFile',
  'disc_file': 'discFile',
  'fcp_file': 'fcpFile',
  'icd_file': 'icdFile',
  'initial_approval_file': 'initialApprovalFile',
  'insurance_file': 'insuranceFile',
  'insurance_inspection_file': 'insuranceInspectionFile',
  'insurance_policy_file': 'insurancePolicyFile',
  'les_file': 'lesFile',
  'title_file': 'titleFile',
  
  // ADDRESS
  'subject_address_1': 'subjectAddress1',
  'subject_address_2': 'subjectAddress2',
  'subject_city': 'subjectCity',
  'subject_state': 'subjectState',
  'subject_zip': 'subjectZip',
  
  // TRACKING DATA
  'pipeline_section': 'pipelineSection',
  'pipeline_stage_id': 'pipelineStageId',
  'is_closed': 'isClosed',
  'account_id': 'accountId',
  'created_by': 'createdBy',
  'notes_updated_by': 'notesUpdatedBy',
  'latest_file_updates_updated_by': 'latestFileUpdatesUpdatedBy',
};

// Reverse mapping for lookup
export const REVERSE_FIELD_MAP = Object.entries(FIELD_NAME_MAP).reduce((acc, [dbField, frontendField]) => {
  acc[frontendField] = dbField;
  return acc;
}, {} as Record<string, string>);

// Helper function to get frontend field name from database field
export function getFrontendFieldName(dbField: string): string {
  return FIELD_NAME_MAP[dbField] || dbField;
}

// Helper function to get database field name from frontend field
export function getDatabaseFieldName(frontendField: string): string {
  return REVERSE_FIELD_MAP[frontendField] || frontendField;
}