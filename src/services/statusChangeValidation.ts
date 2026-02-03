// Status change validation rules
// Maps field names to their status values and required conditions

export interface StatusChangeRule {
  requires: string | string[]; // field name(s) that must be populated
  message: string;
  actionLabel?: string;
  actionType?: 'upload_file' | 'set_field';
}

export interface StatusChangeRules {
  [fieldName: string]: {
    [statusValue: string]: StatusChangeRule;
  };
}

// Pipeline stage change validation rules
export interface PipelineStageRule {
  requires: string[];
  message: string;
  actionLabel?: string;
  bypassField?: string;
  bypassValues?: string[];
}

export interface PipelineStageRules {
  [stageKey: string]: PipelineStageRule;
}

export const pipelineStageRules: PipelineStageRules = {
  'pending-app': {
    requires: ['lead_strength', 'likely_to_apply'],
    message: 'Please update Lead Strength and Likely to Apply before moving to Pending App',
    actionLabel: 'Update Lead Details'
  },
  'active': {
    requires: ['contract_file'],
    message: 'Please upload a contract before moving to Active pipeline',
    actionLabel: 'Upload Contract',
    bypassField: 'pr_type',
    bypassValues: ['R', 'HELOC']
  }
};

export const statusChangeRules: StatusChangeRules = {
  disclosure_status: {
    'Ordered': {
      requires: 'disc_file',
      message: 'You must upload a Disclosure document before setting status to Ordered',
      actionLabel: 'Upload Disclosure Package',
      actionType: 'upload_file'
    },
    'Sent': {
      requires: 'disc_file',
      message: 'You must upload a Disclosure document before setting status to Sent',
      actionLabel: 'Upload Disclosure Package',
      actionType: 'upload_file'
    },
    'Signed': {
      requires: 'disc_file',
      message: 'Upload the signed disclosures to change status to Signed',
      actionLabel: 'Upload Signed Disclosures',
      actionType: 'upload_file'
    }
  },
  loan_status: {
    'AWC': {
      requires: 'initial_approval_file',
      message: 'Upload the initial approval to change status to AWC',
      actionLabel: 'Upload Initial Approval',
      actionType: 'upload_file'
    }
  },
  appraisal_status: {
    'Scheduled': {
      requires: 'appr_date_time',
      message: 'Set the appraisal date/time to change status to Scheduled',
      actionLabel: 'Set Appraisal Date/Time',
      actionType: 'set_field'
    },
    'Received': {
      requires: 'appraisal_file',
      message: 'Upload the appraisal report to change status to Received',
      actionLabel: 'Upload Appraisal Report',
      actionType: 'upload_file'
    }
  },
  title_status: {
    'Ordered': {
      requires: 'title_eta',
      message: 'Enter a Title ETA before setting status to Ordered',
      actionLabel: 'Set Title ETA',
      actionType: 'set_field'
    },
    'Received': {
      requires: 'title_file',
      message: 'Upload the title work to change status to Received',
      actionLabel: 'Upload Title File',
      actionType: 'upload_file'
    }
  },
  hoi_status: {
    'Received': {
      requires: 'insurance_policy_file',
      message: 'Upload the HOI policy to change status to Received',
      actionLabel: 'Upload HOI Policy',
      actionType: 'upload_file'
    }
  },
  insurance_status: {
    'Received': {
      requires: 'insurance_file',
      message: 'Upload the HOI policy to change status to Received',
      actionLabel: 'Upload HOI Policy',
      actionType: 'upload_file'
    }
  },
  package_status: {
    'Final': {
      requires: 'fcp_file',
      message: 'Upload the final closing package to change status to Final',
      actionLabel: 'Upload Final Closing Package',
      actionType: 'upload_file'
    }
  },
  condo_status: {
    'Ordered': {
      requires: ['condo_ordered_date', 'condo_eta'],
      message: 'Enter Order Date and ETA before setting status to Ordered',
      actionLabel: 'Set Order Details',
      actionType: 'set_field'
    },
    'Approved': {
      requires: 'condo_file',
      message: 'Upload condo documents to change status to Approved',
      actionLabel: 'Upload Condo Documents',
      actionType: 'upload_file'
    }
  }
};

export interface ValidationResult {
  isValid: boolean;
  rule?: StatusChangeRule;
  fieldName?: string;
  newValue?: string;
}

export function validateStatusChange(
  fieldName: string,
  newValue: string,
  lead: any
): ValidationResult {
  const fieldRules = statusChangeRules[fieldName];
  if (!fieldRules) {
    return { isValid: true };
  }

  const rule = fieldRules[newValue];
  if (!rule) {
    return { isValid: true };
  }

  // Check if the required field(s) are populated
  const requiredFields = Array.isArray(rule.requires) ? rule.requires : [rule.requires];
  
  for (const fieldToCheck of requiredFields) {
    const requiredValue = lead[fieldToCheck];
    if (!requiredValue || (requiredValue.trim && requiredValue.trim() === '')) {
      return {
        isValid: false,
        rule,
        fieldName,
        newValue
      };
    }
  }

  return { isValid: true };
}

// Pipeline stage validation
export interface PipelineValidationResult {
  isValid: boolean;
  rule?: PipelineStageRule;
  stageKey?: string;
  missingFields?: string[];
}

export function validatePipelineStageChange(
  targetStageKey: string,
  lead: any,
  bypassRefinance: boolean = false
): PipelineValidationResult {
  const rule = pipelineStageRules[targetStageKey];
  if (!rule) {
    return { isValid: true };
  }

  // Check if rule has bypass conditions (for refinances)
  if (rule.bypassField && rule.bypassValues) {
    const bypassValue = lead[rule.bypassField];
    if (rule.bypassValues.includes(bypassValue) || bypassRefinance) {
      return { isValid: true };
    }
  }

  const missingFields: string[] = [];
  
  for (const fieldToCheck of rule.requires) {
    const value = lead[fieldToCheck];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(fieldToCheck);
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      rule,
      stageKey: targetStageKey,
      missingFields
    };
  }

  return { isValid: true };
}

// Human-readable label for completion requirements
export function getCompletionRequirementLabel(requirementType: string | null): string {
  if (!requirementType || requirementType === 'none') return '—';
  
  const labels: Record<string, string> = {
    'log_call_borrower': 'Log call with borrower',
    'log_call_buyer_agent': 'Log call with buyer\'s agent',
    'log_call_listing_agent': 'Log call with listing agent',
    'log_note_borrower': 'Log note for borrower',
    'field_populated:appr_date_time': 'Appraisal date/time populated',
    'field_populated:lock_expiration_date': 'Lock expiration date populated',
    'field_value:package_status=Final': 'Package Status = Final',
    'field_value:title_status=Received': 'Title Status = Received',
    'field_value:loan_status=AWC': 'Loan Status = AWC',
    'field_value:loan_status=SUB': 'Loan Status = SUB',
    'field_value:disclosure_status=Ordered,Sent,Signed': 'Disclosure Status = Ordered/Sent/Signed',
    'field_value:epo_status=Sent': 'EPO Status = Sent'
  };
  
  return labels[requirementType] || requirementType;
}
