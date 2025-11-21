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

  // Check for buyer's agent call log
  if (task.completion_requirement_type === 'log_call_buyer_agent') {
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
  if (task.completion_requirement_type === 'log_call_listing_agent') {
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
  if (task.completion_requirement_type === 'log_call_borrower') {
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

  return { canComplete: true };
}
