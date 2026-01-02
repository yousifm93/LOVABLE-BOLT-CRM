import { supabase } from "@/integrations/supabase/client";

export interface TaskCompletionValidationResult {
  canComplete: boolean;
  message?: string;
  missingRequirement?: string;
  contactInfo?: {
    name: string;
    phone?: string;
    type: 'buyer_agent' | 'listing_agent' | 'borrower';
    id?: string;
  };
}

export async function validateTaskCompletion(
  task: any
): Promise<TaskCompletionValidationResult> {
  // Return early if no requirement
  if (
    !task.completion_requirement_type ||
    task.completion_requirement_type === 'none'
  ) {
    return { canComplete: true };
  }

  const requirementType = task.completion_requirement_type;

  // Check for buyer's agent call log
  if (requirementType === 'log_call_buyer_agent') {
    const agentId = task.lead?.buyer_agent_id || task.borrower?.buyer_agent_id;
    if (!agentId) return { canComplete: true }; // No agent assigned

    // Check if call log exists in agent_call_logs for this agent
    const { data, error } = await supabase
      .from('agent_call_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        canComplete: false,
        message: "You must log a call with the buyer's agent before completing this task",
        missingRequirement: 'log_call_buyer_agent',
        contactInfo: {
          name: task.buyer_agent
            ? `${task.buyer_agent.first_name} ${task.buyer_agent.last_name}`
            : 'Buyer\'s Agent',
          phone: task.buyer_agent?.phone,
          type: 'buyer_agent',
          id: agentId,
        },
      };
    }
  }

  // Check for listing agent call log
  if (requirementType === 'log_call_listing_agent') {
    const agentId = task.lead?.listing_agent_id || task.borrower?.listing_agent_id;
    if (!agentId) return { canComplete: true };

    const { data, error } = await supabase
      .from('agent_call_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        canComplete: false,
        message: 'You must log a call with the listing agent before completing this task',
        missingRequirement: 'log_call_listing_agent',
        contactInfo: {
          name: task.listing_agent
            ? `${task.listing_agent.first_name} ${task.listing_agent.last_name}`
            : 'Listing Agent',
          phone: task.listing_agent?.phone,
          type: 'listing_agent',
          id: agentId,
        },
      };
    }
  }

  // Check for borrower call log
  if (requirementType === 'log_call_borrower') {
    const borrowerId = task.borrower_id;
    if (!borrowerId) return { canComplete: true };

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('lead_id', borrowerId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        canComplete: false,
        message: 'You must log a call with the borrower before completing this task',
        missingRequirement: 'log_call_borrower',
        contactInfo: {
          name: task.borrower
            ? `${task.borrower.first_name} ${task.borrower.last_name}`
            : 'Borrower',
          phone: task.lead?.phone || task.borrower?.phone,
          type: 'borrower',
          id: borrowerId,
        },
      };
    }
  }

  // Check for borrower note log
  if (requirementType === 'log_note_borrower') {
    const borrowerId = task.borrower_id;
    if (!borrowerId) return { canComplete: true };

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('lead_id', borrowerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        canComplete: false,
        message: 'You must add a note for the borrower before completing this task',
        missingRequirement: 'log_note_borrower',
        contactInfo: {
          name: task.borrower
            ? `${task.borrower.first_name} ${task.borrower.last_name}`
            : 'Borrower',
          phone: task.lead?.phone || task.borrower?.phone,
          type: 'borrower',
          id: borrowerId,
        },
      };
    }
  }

  // Check for field populated requirements (field_populated:field_name)
  if (requirementType.startsWith('field_populated:')) {
    const fieldName = requirementType.split(':')[1];
    const borrowerId = task.borrower_id;
    if (!borrowerId) return { canComplete: true };

    const { data: lead, error } = await supabase
      .from('leads')
      .select(fieldName)
      .eq('id', borrowerId)
      .single();

    if (error || !lead || !lead[fieldName]) {
      const fieldDisplayNames: Record<string, string> = {
        'appr_date_time': 'Appraisal Date/Time',
        'lock_expiration_date': 'Lock Expiration Date',
      };
      return {
        canComplete: false,
        message: `You must populate ${fieldDisplayNames[fieldName] || fieldName} before completing this task`,
        missingRequirement: requirementType,
      };
    }
  }

  // Check for field value requirements (field_value:field_name=value1,value2)
  if (requirementType.startsWith('field_value:')) {
    const [, fieldConfig] = requirementType.split(':');
    const [fieldName, valuesStr] = fieldConfig.split('=');
    let allowedValues = valuesStr.split(',');
    
    // Special handling for loan_status=SUB - also accept SUV as a valid value
    if (fieldName === 'loan_status' && allowedValues.includes('SUB')) {
      allowedValues = [...allowedValues, 'SUV'];
    }
    
    const borrowerId = task.borrower_id;
    if (!borrowerId) return { canComplete: true };

    const { data: lead, error } = await supabase
      .from('leads')
      .select(fieldName)
      .eq('id', borrowerId)
      .single();

    if (error || !lead || !allowedValues.includes(lead[fieldName])) {
      const fieldDisplayNames: Record<string, string> = {
        'package_status': 'Package Status',
        'title_status': 'Title Status',
        'loan_status': 'Loan Status',
        'disclosure_status': 'Disclosure Status',
        'epo_status': 'EPO Status',
      };
      // Show original expected value in message, not the expanded list
      const displayValues = valuesStr.split(',');
      return {
        canComplete: false,
        message: `${fieldDisplayNames[fieldName] || fieldName} must be ${displayValues.join(' or ')} before completing this task`,
        missingRequirement: requirementType,
      };
    }
  }

  return { canComplete: true };
}
