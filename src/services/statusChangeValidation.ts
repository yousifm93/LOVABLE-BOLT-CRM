// Status change validation rules
// Maps field names to their status values and required conditions

export interface StatusChangeRule {
  requires: string; // field name that must be populated
  message: string;
  actionLabel?: string;
  actionType?: 'upload_file' | 'set_field';
}

export interface StatusChangeRules {
  [fieldName: string]: {
    [statusValue: string]: StatusChangeRule;
  };
}

export const statusChangeRules: StatusChangeRules = {
  disclosure_status: {
    'Sent': {
      requires: 'disc_file',
      message: 'Upload the disclosure package to change status to Sent',
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
  appraisal_status: {
    'Received': {
      requires: 'appraisal_file',
      message: 'Upload the appraisal report to change status to Received',
      actionLabel: 'Upload Appraisal Report',
      actionType: 'upload_file'
    }
  },
  title_status: {
    'Received': {
      requires: 'title_file',
      message: 'Upload the title work to change status to Received',
      actionLabel: 'Upload Title File',
      actionType: 'upload_file'
    }
  },
  insurance_status: {
    'Received': {
      requires: 'insurance_file',
      message: 'Upload the insurance binder to change status to Received',
      actionLabel: 'Upload Insurance File',
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

  // Check if the required field is populated
  const requiredValue = lead[rule.requires];
  if (requiredValue && requiredValue.trim && requiredValue.trim() !== '') {
    return { isValid: true };
  }
  if (requiredValue && !requiredValue.trim) {
    return { isValid: true };
  }

  return {
    isValid: false,
    rule,
    fieldName,
    newValue
  };
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
