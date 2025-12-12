// Loan Program Document Requirements Mapping
// Defines what documents are required for each loan program

export interface DocumentRequirement {
  docType: string;
  label: string;
  description: string;
  required: boolean;
  quantity?: number; // e.g., "2 years" = quantity 2
  period?: string; // e.g., "years", "months", "days"
}

export interface LoanProgramRequirements {
  program: string;
  label: string;
  description: string;
  documents: DocumentRequirement[];
}

export const LOAN_PROGRAM_REQUIREMENTS: Record<string, LoanProgramRequirements> = {
  conventional: {
    program: 'conventional',
    label: 'Conventional',
    description: 'Standard Fannie Mae/Freddie Mac conforming loans',
    documents: [
      { docType: 'w2', label: 'W-2', description: 'Wage and Tax Statement', required: true, quantity: 2, period: 'years' },
      { docType: 'pay_stub', label: 'Pay Stubs', description: 'Most recent 30 days', required: true, quantity: 30, period: 'days' },
      { docType: 'form_1040', label: '1040 Tax Returns', description: 'Personal tax returns (if self-employed)', required: false, quantity: 2, period: 'years' },
      { docType: 'schedule_c', label: 'Schedule C', description: 'Sole proprietor business income', required: false },
      { docType: 'schedule_e', label: 'Schedule E', description: 'Rental property income', required: false },
      { docType: 'k1', label: 'K-1', description: 'Partnership/S-Corp income', required: false, quantity: 2, period: 'years' },
      { docType: 'form_1120s', label: '1120-S', description: 'S-Corporation tax returns', required: false, quantity: 2, period: 'years' },
      { docType: 'voe', label: 'VOE', description: 'Verification of Employment (for gaps)', required: false },
    ]
  },
  fha: {
    program: 'fha',
    label: 'FHA',
    description: 'Federal Housing Administration insured loans',
    documents: [
      { docType: 'w2', label: 'W-2', description: 'Wage and Tax Statement', required: true, quantity: 2, period: 'years' },
      { docType: 'pay_stub', label: 'Pay Stubs', description: 'Most recent 30 days', required: true, quantity: 30, period: 'days' },
      { docType: 'form_1040', label: '1040 Tax Returns', description: 'Personal tax returns (if self-employed)', required: false, quantity: 2, period: 'years' },
      { docType: 'voe', label: 'VOE', description: 'Verification of Employment (required for gaps)', required: true },
      { docType: 'schedule_c', label: 'Schedule C', description: 'Sole proprietor business income', required: false },
      { docType: 'k1', label: 'K-1', description: 'Partnership/S-Corp income', required: false, quantity: 2, period: 'years' },
      { docType: 'form_1120s', label: '1120-S', description: 'S-Corporation tax returns', required: false, quantity: 2, period: 'years' },
    ]
  },
  va: {
    program: 'va',
    label: 'VA',
    description: 'Veterans Affairs guaranteed loans',
    documents: [
      { docType: 'w2', label: 'W-2', description: 'Wage and Tax Statement', required: true, quantity: 2, period: 'years' },
      { docType: 'pay_stub', label: 'Pay Stubs', description: 'Most recent 30 days', required: true, quantity: 30, period: 'days' },
      { docType: 'voe', label: 'VOE', description: 'Verification of Employment', required: true },
      { docType: 'form_1040', label: '1040 Tax Returns', description: 'Personal tax returns (if self-employed)', required: false, quantity: 2, period: 'years' },
      { docType: 'k1', label: 'K-1', description: 'Partnership/S-Corp income', required: false, quantity: 2, period: 'years' },
      { docType: 'form_1120s', label: '1120-S', description: 'S-Corporation tax returns', required: false, quantity: 2, period: 'years' },
    ]
  },
  usda: {
    program: 'usda',
    label: 'USDA',
    description: 'Rural Development loans',
    documents: [
      { docType: 'w2', label: 'W-2', description: 'Wage and Tax Statement', required: true, quantity: 2, period: 'years' },
      { docType: 'pay_stub', label: 'Pay Stubs', description: 'Most recent 30 days', required: true, quantity: 30, period: 'days' },
      { docType: 'form_1040', label: '1040 Tax Returns', description: 'Personal tax returns (all household members)', required: true, quantity: 2, period: 'years' },
      { docType: 'voe', label: 'VOE', description: 'Verification of Employment', required: true },
      { docType: 'k1', label: 'K-1', description: 'Partnership/S-Corp income', required: false, quantity: 2, period: 'years' },
      { docType: 'form_1120s', label: '1120-S', description: 'S-Corporation tax returns', required: false, quantity: 2, period: 'years' },
    ]
  },
  dscr: {
    program: 'dscr',
    label: 'DSCR',
    description: 'Debt Service Coverage Ratio - Investment property loans',
    documents: [
      { docType: 'lease_agreement', label: 'Lease Agreement', description: 'Current lease for the property', required: true },
      { docType: 'rent_roll', label: 'Rent Roll', description: 'Current rent roll or market rent analysis', required: true },
      { docType: 'schedule_e', label: 'Schedule E', description: 'Rental income history (optional)', required: false },
    ]
  },
  bank_statement: {
    program: 'bank_statement',
    label: 'Bank Statement',
    description: 'Self-employed borrowers using bank deposits as income',
    documents: [
      { docType: 'bank_statement', label: 'Bank Statements', description: 'Personal or business bank statements', required: true, quantity: 12, period: 'months' },
      { docType: 'form_1099', label: '1099 Forms', description: 'Independent contractor income (optional)', required: false },
      { docType: 'schedule_c', label: 'Schedule C', description: 'Business income (optional)', required: false },
    ]
  },
  jumbo: {
    program: 'jumbo',
    label: 'Jumbo',
    description: 'Non-conforming loans exceeding conventional limits',
    documents: [
      { docType: 'w2', label: 'W-2', description: 'Wage and Tax Statement', required: true, quantity: 2, period: 'years' },
      { docType: 'pay_stub', label: 'Pay Stubs', description: 'Most recent 30 days', required: true, quantity: 30, period: 'days' },
      { docType: 'form_1040', label: '1040 Tax Returns', description: 'Full personal tax returns with all schedules', required: true, quantity: 2, period: 'years' },
      { docType: 'schedule_c', label: 'Schedule C', description: 'Sole proprietor business income', required: false },
      { docType: 'schedule_e', label: 'Schedule E', description: 'Rental property income', required: false },
      { docType: 'k1', label: 'K-1', description: 'Partnership/S-Corp income', required: false },
      { docType: 'form_1065', label: 'Form 1065', description: 'Partnership returns', required: false },
      { docType: 'form_1120s', label: 'Form 1120S', description: 'S-Corporation returns', required: false },
      { docType: 'voe', label: 'VOE', description: 'Verification of Employment', required: true },
    ]
  },
  non_qm: {
    program: 'non_qm',
    label: 'Non-QM',
    description: 'Non-Qualified Mortgage - Alternative documentation',
    documents: [
      { docType: 'bank_statement', label: 'Bank Statements', description: '12-24 months bank statements OR', required: false, quantity: 24, period: 'months' },
      { docType: 'form_1099', label: '1099 Forms', description: '1099 income only OR', required: false, quantity: 2, period: 'years' },
      { docType: 'asset_statement', label: 'Asset Statements', description: 'Asset depletion documentation', required: false },
      { docType: 'dscr_worksheet', label: 'DSCR Worksheet', description: 'For investment properties', required: false },
    ]
  }
};

// Document type metadata for display
export const DOC_TYPE_METADATA: Record<string, { label: string; icon: string; color: string }> = {
  pay_stub: { label: 'Pay Stub', icon: 'FileText', color: 'bg-blue-100 text-blue-800' },
  w2: { label: 'W-2', icon: 'FileText', color: 'bg-green-100 text-green-800' },
  form_1099: { label: '1099', icon: 'FileText', color: 'bg-purple-100 text-purple-800' },
  form_1040: { label: '1040', icon: 'FileText', color: 'bg-orange-100 text-orange-800' },
  schedule_c: { label: 'Schedule C', icon: 'FileText', color: 'bg-pink-100 text-pink-800' },
  schedule_e: { label: 'Schedule E', icon: 'FileText', color: 'bg-indigo-100 text-indigo-800' },
  schedule_f: { label: 'Schedule F', icon: 'FileText', color: 'bg-yellow-100 text-yellow-800' },
  k1: { label: 'K-1', icon: 'FileText', color: 'bg-red-100 text-red-800' },
  form_1065: { label: '1065', icon: 'FileText', color: 'bg-cyan-100 text-cyan-800' },
  form_1120s: { label: '1120S', icon: 'FileText', color: 'bg-teal-100 text-teal-800' },
  voe: { label: 'VOE', icon: 'FileText', color: 'bg-gray-100 text-gray-800' },
  bank_statement: { label: 'Bank Statement', icon: 'Landmark', color: 'bg-emerald-100 text-emerald-800' },
  lease_agreement: { label: 'Lease Agreement', icon: 'Home', color: 'bg-amber-100 text-amber-800' },
  rent_roll: { label: 'Rent Roll', icon: 'ListChecks', color: 'bg-lime-100 text-lime-800' },
  asset_statement: { label: 'Asset Statement', icon: 'Wallet', color: 'bg-violet-100 text-violet-800' },
  dscr_worksheet: { label: 'DSCR Worksheet', icon: 'Calculator', color: 'bg-fuchsia-100 text-fuchsia-800' },
};

export function getRequiredDocuments(program: string): DocumentRequirement[] {
  return LOAN_PROGRAM_REQUIREMENTS[program]?.documents.filter(d => d.required) || [];
}

export function getAllDocuments(program: string): DocumentRequirement[] {
  return LOAN_PROGRAM_REQUIREMENTS[program]?.documents || [];
}

export function getProgramLabel(program: string): string {
  return LOAN_PROGRAM_REQUIREMENTS[program]?.label || program;
}
