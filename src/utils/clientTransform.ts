import { CRMClient, PipelineStage } from '@/types/crm';
import { calculateMonthlyPayment } from './formatters';

// Helper to calculate down payment
const calculateDownPayment = (salesPrice: number | null, loanAmount: number | null): number | null => {
  if (salesPrice && loanAmount && salesPrice >= loanAmount) {
    return salesPrice - loanAmount;
  }
  return null;
};

// Helper to calculate LTV - uses MIN(sales_price, appraised_value) per industry standard
const calculateLTV = (loanAmount: number | null, appraisalValue: string | null, salesPrice: number | null): number | null => {
  if (!loanAmount || loanAmount <= 0) return null;
  
  const appraisalNum = appraisalValue ? parseFloat(appraisalValue) : null;
  const hasAppraisal = appraisalNum && appraisalNum > 0;
  const hasSalesPrice = salesPrice && salesPrice > 0;
  
  if (hasAppraisal && hasSalesPrice) {
    // Use the lesser of sales price or appraised value
    const denominator = Math.min(salesPrice, appraisalNum);
    return (loanAmount / denominator) * 100;
  } else if (hasAppraisal) {
    return (loanAmount / appraisalNum) * 100;
  } else if (hasSalesPrice) {
    return (loanAmount / salesPrice) * 100;
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
  const ltv = calculateLTV(lead.loan_amount, lead.appraisal_value, lead.sales_price);
  const cashToClose = (downPayment || 0) + (lead.closing_costs || 0);
  
  return {
    // Top-level fields for gray box compatibility
    creditScore: lead.fico_score || null,
    interestRate: lead.interest_rate || null,
    
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
    listing_agent_id: lead.listing_agent_id || null,
    listing_agent: lead.listing_agent || null,
  ops: {
      stage: (lead.pipeline_stage?.name || 'leads').toLowerCase().replace(/\s+/g, '-') as PipelineStage,
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
    monthlyPmtGoal: lead.monthly_pmt_goal ?? null,
    cashToCloseGoal: lead.cash_to_close_goal ?? null,
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
  monthlyLiabilities: lead.monthly_liabilities || null,
  monthly_liabilities: lead.monthly_liabilities || null,
  dti: lead.dti || null,
  
  // Calculated fields
  cashToClose: cashToClose,
  totalMonthlyIncome: lead.total_monthly_income || null,
  principalInterest: lead.principal_interest || null,
  
  // Loan numbers and costs
  mbLoanNumber: lead.mb_loan_number || null,
  lenderLoanNumber: lead.lender_loan_number || null,
  closingCosts: lead.closing_costs || null,
  
  // Third party statuses
  condoStatus: lead.condo_status || null,
  appraisalStatus: lead.appraisal_status || null,
  hoiStatus: lead.hoi_status || null,
  propertyTaxes: lead.property_taxes || null,
  homeownersInsurance: lead.homeowners_insurance || null,
  mortgageInsurance: lead.mortgage_insurance || null,
  hoaDues: lead.hoa_dues || null,
  
  number_of_dependents: lead.number_of_dependents || null,
    borrower_current_address: lead.borrower_current_address || null,
    time_at_current_address_years: lead.time_at_current_address_years || null,
    time_at_current_address_months: lead.time_at_current_address_months || null,
    military_veteran: lead.military_veteran || false,
    
    // Co-Borrower Information
    co_borrower_first_name: lead.co_borrower_first_name || null,
    co_borrower_last_name: lead.co_borrower_last_name || null,
    co_borrower_email: lead.co_borrower_email || null,
    co_borrower_phone: lead.co_borrower_phone || null,
    co_borrower_relationship: lead.co_borrower_relationship || null,
    
    // Declarations
    decl_primary_residence: lead.decl_primary_residence ?? null,
    decl_ownership_interest: lead.decl_ownership_interest ?? null,
    decl_seller_affiliation: lead.decl_seller_affiliation ?? null,
    decl_borrowing_undisclosed: lead.decl_borrowing_undisclosed ?? null,
    
    // Demographics
    demographic_ethnicity: lead.demographic_ethnicity || null,
    demographic_race: lead.demographic_race || null,
    demographic_gender: lead.demographic_gender || null,
    
    // Latest File Updates with metadata
    latest_file_updates: lead.latest_file_updates || null,
    latest_file_updates_updated_at: lead.latest_file_updates_updated_at || null,
    latest_file_updates_updated_by: lead.latest_file_updates_updated_by || null,
    
    // Key Dates
    closeDate: lead.close_date || null,
    financeContingency: lead.finance_contingency || null,
    
    // Rate Lock Information
    lock_expiration_date: lead.lock_expiration_date || null,
    lockExpirationDate: lead.lock_expiration_date || null,
    dscr_ratio: lead.dscr_ratio || null,
    dscrRatio: lead.dscr_ratio || null,
    prepayment_penalty: lead.prepayment_penalty || null,
    prepaymentPenalty: lead.prepayment_penalty || null,
    
    // PITI
    piti: lead.piti || null,
    
    // Active File Document fields (for green background display)
    le_file: lead.le_file || null,
    contract_file: lead.contract_file || null,
    initial_approval_file: lead.initial_approval_file || null,
    disc_file: lead.disc_file || null,
    appraisal_file: lead.appraisal_file || null,
    insurance_file: lead.insurance_file || null,
    icd_file: lead.icd_file || null,
    fcp_file: lead.fcp_file || null,
    inspection_file: lead.inspection_file || null,
    title_file: lead.title_file || null,
    condo_file: lead.condo_file || null,
    rate_lock_file: lead.rate_lock_file || null,
    
    // New fields
    appraisal_received_on: lead.appraisal_received_on || null,
    subject_property_rental_income: lead.subject_property_rental_income || null,
    discount_points: lead.discount_points || null,
    discount_points_percentage: lead.discount_points_percentage || null,
    apr: lead.apr || null,
    
    // Subject address fields for DetailsTab sync
    subject_address_1: lead.subject_address_1 || null,
    subject_address_2: lead.subject_address_2 || null,
    subject_city: lead.subject_city || null,
    subject_state: lead.subject_state || null,
    subject_zip: lead.subject_zip || null,
    
    // Paper application URL from mortgage application submission
    paper_application_url: lead.paper_application_url || null,
  };
}
