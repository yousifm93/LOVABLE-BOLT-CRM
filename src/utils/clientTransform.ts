import { CRMClient, PipelineStage } from '@/types/crm';

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
      ficoScore: lead.estimated_fico,
      monthlyPayment: lead.piti,
      prType: lead.loan_type || 'Purchase',
    },
    ops: {
      stage: lead.pipeline_stage?.name || 'leads',
      status: lead.status,
    },
    dates: {
      createdOn: lead.created_at,
    },
    meta: {
      notes: '',
    },
    name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    databaseId: lead.id,
  };
}