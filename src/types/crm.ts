// Unified CRM data model for Mortgage Bolt
export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneMobile: string;
  phoneAlt?: string;
  avatar?: string;
  title?: string;
  company?: string;
}

export interface Loan {
  loanNumber?: string;
  loanAmount: string;
  salesPrice?: string;
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