import { CRMClient, PipelineStage } from '@/types/crm';

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