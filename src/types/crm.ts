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
  arriveLoanNumber?: number;
  prType?: string;
  source?: string;
  leadStrength?: string;
  isClosed?: boolean;
  searchStage?: string;
  titleEta?: string;
  appraisalDateTime?: string;
  appraisalEta?: string;
  financingContingency?: string;
  monthlyPaymentGoal?: number;
  cashToCloseGoal?: number;
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
    { key: 'leads', label: 'New', icon: '📞' },
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
    { key: 'stage1', label: '', icon: '' },
    { key: 'stage2', label: '', icon: '' },
    { key: 'stage3', label: '', icon: '' },
    { key: 'stage4', label: '', icon: '' }
  ]
} as const;

export const TEAM_MEMBERS = [
  'Yousif',
  'Salma', 
  'Herman Daza'
] as const;

// Master field name mapping: Database field → Frontend display key
export const FIELD_NAME_MAP: Record<string, string> = {
  // Core Identity Fields
  'first_name': 'firstName',
  'last_name': 'lastName',
  'middle_name': 'middleName',
  'email': 'email',
  'phone': 'phone',
  
  // Agent Fields - Always use "buyersAgent" internally
  'buyer_agent_id': 'buyersAgentId',
  'real_estate_agent': 'buyersAgentId',
  'listing_agent_id': 'listingAgentId',
  
  // Assignment and Status
  'teammate_assigned': 'user',
  'converted': 'status',
  'task_eta': 'dueDate',
  'referral_source': 'referralSource',
  'referred_via': 'referredVia',
  
  // Loan Fields
  'loan_type': 'loanType',
  'loan_amount': 'loanAmount',
  'sales_price': 'salesPrice',
  'program': 'loanProgram',
  'interest_rate': 'interestRate',
  'term': 'term',
  'principal_interest': 'principalInterest',
  'property_taxes': 'propertyTaxes',
  'homeowners_insurance': 'homeownersInsurance',
  'mortgage_insurance': 'mortgageInsurance',
  'hoa_dues': 'hoaDues',
  'piti': 'piti',
  'dti': 'dti',
  'escrows': 'escrows',
  
  // Property Fields
  'property_type': 'propertyType',
  'occupancy': 'occupancy',
  'subject_address_1': 'subjectAddress1',
  'subject_address_2': 'subjectAddress2',
  'subject_city': 'subjectCity',
  'subject_state': 'subjectState',
  'subject_zip': 'subjectZip',
  'appraisal_value': 'appraisalValue',
  
  // Borrower Info Fields
  'income_type': 'incomeType',
  'estimated_fico': 'creditScore',
  'dob': 'dateOfBirth',
  'borrower_current_address': 'currentAddress',
  'own_rent_current_address': 'ownRentCurrentAddress',
  'time_at_current_address_years': 'timeAtAddressYears',
  'time_at_current_address_months': 'timeAtAddressMonths',
  'military_veteran': 'militaryVeteran',
  'reo': 'reo',
  
  // Financial Fields
  'total_monthly_income': 'totalMonthlyIncome',
  'monthly_liabilities': 'monthlyLiabilities',
  'assets': 'assets',
  'down_pmt': 'downPayment',
  
  // Timeline Fields
  'pending_app_at': 'pendingAppOn',
  'app_complete_at': 'appCompleteAt',
  'pre_qualified_at': 'preQualifiedAt',
  'pre_approved_at': 'preApprovedAt',
  'close_date': 'closeDate',
  'closed_at': 'closedAt',
  'lock_expiration_date': 'lockExpirationDate',
  'lead_on_date': 'leadDate',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  
  // Process Status Fields
  'disclosure_status': 'disclosureStatus',
  'loan_status': 'loanStatus',
  'appraisal_status': 'appraisalStatus',
  'title_status': 'titleStatus',
  'hoi_status': 'hoiStatus',
  'condo_status': 'condoStatus',
  'cd_status': 'cdStatus',
  'package_status': 'packageStatus',
  'ba_status': 'baStatus',
  'epo_status': 'epoStatus',
  'mi_status': 'miStatus',
  
  // Document Fields
  'les_file': 'lesFile',
  'contract_file': 'contractFile',
  'initial_approval_file': 'initialApprovalFile',
  'disc_file': 'discFile',
  'appraisal_file': 'appraisalFile',
  'insurance_file': 'insuranceFile',
  'icd_file': 'icdFile',
  'fcp_file': 'fcpFile',
  
  // Additional Fields
  'notes': 'notes',
  'pipeline_stage_id': 'pipelineStageId',
  'pipeline_section': 'pipelineSection',
  'arrive_loan_number': 'arriveLoanNumber',
  'pr_type': 'prType',
  'source': 'source',
  'lead_strength': 'leadStrength',
  'is_closed': 'isClosed',
  'search_stage': 'searchStage',
  'title_eta': 'titleEta',
  'appr_date_time': 'appraisalDateTime',
  'appr_eta': 'appraisalEta',
  'fin_cont': 'financingContingency',
  'monthly_pmt_goal': 'monthlyPaymentGoal',
  'cash_to_close_goal': 'cashToCloseGoal',
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