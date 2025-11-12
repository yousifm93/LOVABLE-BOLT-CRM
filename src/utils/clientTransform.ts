import { CRMClient, PipelineStage } from '@/types/crm';
import { calculateMonthlyPayment } from './formatters';

// Helper to calculate down payment
const calculateDownPayment = (salesPrice: number | null, loanAmount: number | null): number | null => {
  if (salesPrice && loanAmount && salesPrice >= loanAmount) {
    return salesPrice - loanAmount;
  }
  return null;
};

// Helper to calculate LTV
const calculateLTV = (loanAmount: number | null, appraisalValue: string | null): number | null => {
  if (loanAmount && appraisalValue) {
    const appraisalNum = parseFloat(appraisalValue);
    if (appraisalNum > 0) {
      return (loanAmount / appraisalNum) * 100;
    }
  }
  return null;
};

// Transform PreQualifiedClient to CRMClient
export function transformPreQualifiedToClient(preQualified: any): CRMClient {
  const [firstName, lastName] = preQualified.name.split(' ');
  
  return {
    person: {
      id: preQualified.id,
      firstName: firstName || '',
      lastName: lastName || '',
      email: preQualified.email,
      phoneMobile: preQualified.phone,
    },
    loan: {
      loanAmount: preQualified.loanAmount,
      loanType: preQualified.loanType,
      prType: 'Purchase',
    },
    ops: {
      stage: 'pre-qualified' as PipelineStage,
      status: preQualified.status,
    },
    dates: {
      createdOn: preQualified.qualifiedDate,
      prequalifiedOn: preQualified.qualifiedDate,
    },
    meta: {
      notes: '',
    },
    name: preQualified.name,
    creditScore: preQualified.creditScore,
    dti: preQualified.dti,
    qualifiedAmount: preQualified.qualifiedAmount,
    expirationDate: preQualified.expirationDate,
    loanOfficer: preQualified.loanOfficer,
  };
}

// Transform PastClient to CRMClient
export function transformPastClientToClient(pastClient: any): CRMClient {
  const [firstName, lastName] = pastClient.name.split(' ');
  
  return {
    person: {
      id: pastClient.id,
      firstName: firstName || '',
      lastName: lastName || '',
      email: pastClient.email,
      phoneMobile: pastClient.phone,
    },
    loan: {
      loanAmount: pastClient.loanAmount,
      loanType: pastClient.loanType,
      prType: 'Purchase',
      interestRate: pastClient.interestRate?.toString(),
      closeDate: pastClient.closingDate,
    },
    ops: {
      stage: 'past-clients' as PipelineStage,
      status: pastClient.status,
    },
    dates: {
      createdOn: pastClient.closingDate,
      closedOn: pastClient.closingDate,
    },
    meta: {
      notes: '',
    },
    name: pastClient.name,
    creditScore: pastClient.creditScore,
    satisfaction: pastClient.satisfaction,
    referrals: pastClient.referrals,
    loanOfficer: pastClient.loanOfficer,
    lastContact: pastClient.lastContact,
    closingDate: pastClient.closingDate,
  };
}

// Transform database Lead to CRMClient with calculated fields
export function transformLeadToClient(lead: any): any {
  const downPayment = calculateDownPayment(lead.sales_price, lead.loan_amount);
  const ltv = calculateLTV(lead.loan_amount, lead.appraisal_value);
  
  return {
    person: {
      id: lead.id,
      firstName: lead.first_name || '',
      lastName: lead.last_name || '',
      email: lead.email,
      phoneMobile: lead.phone,
      phone: lead.phone,
    },
    loan: {
      loanAmount: lead.loan_amount,
      salesPrice: lead.sales_price,
      purchasePrice: lead.sales_price, // Same as salesPrice
      loanType: lead.loan_type,
      loanProgram: lead.program, // Map program field
      mortgageType: lead.program, // Same as loanProgram for consistency
      appraisedValue: lead.appraisal_value ? parseFloat(lead.appraisal_value) : null,
      downPayment: downPayment,
      ltv: ltv,
      interestRate: lead.interest_rate,
      term: lead.term,
      escrowWaiver: lead.escrows === 'Waived',
      ficoScore: lead.fico_score,
      monthlyPayment: lead.piti || calculateMonthlyPayment(lead.loan_amount, lead.interest_rate, lead.term),
      prType: lead.loan_type || 'Purchase',
    },
    property: {
      propertyType: lead.property_type || '',
    },
    buyer_agent_id: lead.buyer_agent_id || null,
    buyer_agent: lead.buyer_agent || null,
    ops: {
      stage: lead.pipeline_stage?.name || 'leads',
      status: lead.status,
      referralSource: lead.referral_source || null,
    },
    dates: {
      createdOn: lead.created_at,
    },
    meta: {
      notes: lead.notes || '',
    },
    notes: lead.notes || '', // Top-level for compatibility
    name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    databaseId: lead.id,
    loanStatus: lead.loan_status || null,
    referral_method: lead.referred_via || null, // Map referred_via to referral_method
    referred_via: lead.referred_via || null,
    referral_source: lead.referral_source || null,
    monthly_payment_goal: lead.monthly_pmt_goal || null,
    cash_to_close_goal: lead.cash_to_close_goal || null,
    ssn: lead.ssn || null,
    dob: lead.dob || null,
    occupancy: lead.occupancy || null,
    residency_type: lead.residency_type || null,
    marital_status: lead.marital_status || null,
    
    // Timestamps for Stage History
    updated_at: lead.updated_at || null,
    created_at: lead.created_at || null,
    lead_on_date: lead.lead_on_date || null,
    pending_app_at: lead.pending_app_at || null,
    app_complete_at: lead.app_complete_at || null,
    pre_qualified_at: lead.pre_qualified_at || null,
    pre_approved_at: lead.pre_approved_at || null,
    active_at: lead.active_at || null,
  
  // Income breakdown
  base_employment_income: lead.base_employment_income || null,
  overtime_income: lead.overtime_income || null,
  bonus_income: lead.bonus_income || null,
  self_employment_income: lead.self_employment_income || null,
  other_income: lead.other_income || null,
  total_monthly_income: lead.total_monthly_income || null,
  
  // Asset breakdown
  checking_account: lead.checking_account || null,
  savings_account: lead.savings_account || null,
  investment_accounts: lead.investment_accounts || null,
  retirement_accounts: lead.retirement_accounts || null,
  gift_funds: lead.gift_funds || null,
  other_assets: lead.other_assets || null,
  assets: lead.assets || null,
  
  // Debt breakdown
  credit_card_debt: lead.credit_card_debt || null,
  auto_loans: lead.auto_loans || null,
  student_loans: lead.student_loans || null,
  other_monthly_debts: lead.other_monthly_debts || null,
  monthly_liabilities: lead.monthly_liabilities || null,
  dti: lead.dti || null,
    number_of_dependents: lead.number_of_dependents || null,
    borrower_current_address: lead.borrower_current_address || null,
    time_at_current_address_years: lead.time_at_current_address_years || null,
    time_at_current_address_months: lead.time_at_current_address_months || null,
    military_veteran: lead.military_veteran || false,
    
    // Latest File Updates with metadata
    latest_file_updates: lead.latest_file_updates || null,
    latest_file_updates_updated_at: lead.latest_file_updates_updated_at || null,
    latest_file_updates_updated_by: lead.latest_file_updates_updated_by || null,
  };
}
