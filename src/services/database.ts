import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export type User = Database['public']['Tables']['users']['Row'];
export type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row'];

export type Note = Database['public']['Tables']['notes']['Row'];
export type NoteInsert = Database['public']['Tables']['notes']['Insert'];

export type CallLog = Database['public']['Tables']['call_logs']['Row'];
export type CallLogInsert = Database['public']['Tables']['call_logs']['Insert'];

export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type SmsLogInsert = Database['public']['Tables']['sms_logs']['Insert'];

export type EmailLog = Database['public']['Tables']['email_logs']['Row'];
export type EmailLogInsert = Database['public']['Tables']['email_logs']['Insert'];

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

export type BuyerAgent = Database['public']['Tables']['buyer_agents']['Row'];
export type BuyerAgentInsert = Database['public']['Tables']['buyer_agents']['Insert'];

// DELETED TABLES - Types removed (tables deleted in migration)
// team_assignments, lead_external_contacts, lead_dates

// Calculate PITI (Principal, Interest, Taxes, Insurance)
export const calculatePITI = (lead: Partial<Lead>): number | null => {
  const pi = lead.principal_interest || 0;
  const taxes = lead.property_taxes || 0;
  const insurance = lead.homeowners_insurance || 0;
  const mi = lead.mortgage_insurance || 0;
  const hoa = lead.hoa_dues || 0;
  
  const total = pi + taxes + insurance + mi + hoa;
  return total > 0 ? total : null;
};

// Calculate DTI (Debt-to-Income Ratio)
export const calculateDTI = (lead: Partial<Lead>): number | null => {
  const piti = calculatePITI(lead) || 0;
  const liabilities = lead.monthly_liabilities || 0;
  const income = lead.total_monthly_income || 0;
  
  if (income === 0) return null;
  
  const dti = ((piti + liabilities) / income) * 100;
  return Math.round(dti * 100) / 100; // Round to 2 decimal places
};

// Validate lead data
export const validateLead = (lead: Partial<Lead>): string[] => {
  const errors: string[] = [];
  
  if (!lead.first_name?.trim()) errors.push("First name is required");
  if (!lead.last_name?.trim()) errors.push("Last name is required");
  
  if (lead.fico_score && (lead.fico_score < 300 || lead.fico_score > 850)) {
    errors.push("FICO score must be between 300 and 850");
  }
  
  const dti = calculateDTI(lead);
  if (dti && dti > 50) {
    errors.push("DTI over 50% may not qualify for most loan programs");
  }
  
  if (lead.loan_amount && lead.loan_amount < 0) {
    errors.push("Loan amount cannot be negative");
  }
  
  if (lead.sales_price && lead.sales_price < 0) {
    errors.push("Sales price cannot be negative");
  }
  
  return errors;
};

// Helper to get current CRM user ID (from users table, NOT auth.users)
async function getCurrentCrmUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  
  if (error || !data) {
    console.error('Could not find CRM user for auth user:', user.id, error);
    return null;
  }
  
  return data.id;
}

// Database service functions
export const databaseService = {
  // Check if lead has associated tasks
  async getTasksCountForLead(leadId: string): Promise<number> {
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', leadId)
      .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
  },

  // Mortgage Applications
  async saveApplication(userId: string, applicationData: any, status: string = 'draft') {
    const { data, error } = await supabase
      .from('mortgage_applications')
      .upsert({
        user_id: userId,
        application_data: applicationData,
        status,
        progress_percentage: applicationData.progressPercentage || 0,
        loan_purpose: applicationData.loanPurpose,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async loadApplication(userId: string) {
    const { data, error } = await supabase
      .from('mortgage_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'draft')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async submitApplication(userId: string, applicationData: any) {
    const { data, error } = await supabase
      .from('mortgage_applications')
      .update({
        application_data: applicationData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        progress_percentage: 100,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllApplications() {
    const { data, error } = await supabase
      .from('mortgage_applications')
      .select(`
        *,
        application_user:application_users(
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async importApplicationToLead(applicationId: string, leadId: string) {
    const { data, error } = await supabase
      .from('mortgage_applications')
      .update({
        status: 'imported',
        imported_to_crm_at: new Date().toISOString(),
        imported_lead_id: leadId,
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createLeadFromApplication(applicationData: any) {
    // Helper to map credit score
    const mapCreditScore = (range: string): number => {
      const map: Record<string, number> = {
        '740-plus': 760,
        '700-739': 720,
        '660-699': 680,
        '620-660': 640,
        'below-620': 580,
      };
      return map[range] || 680;
    };

    // Helper to format race
    const formatRace = (race: any): string => {
      const races: string[] = [];
      if (race.americanIndianAlaskaNative) races.push('American Indian/Alaska Native');
      if (race.asian) races.push('Asian');
      if (race.blackAfricanAmerican) races.push('Black/African American');
      if (race.nativeHawaiianPacificIslander) races.push('Native Hawaiian/Pacific Islander');
      if (race.white) races.push('White');
      if (race.doNotWishToProvide) races.push('Prefer not to say');
      return races.join(', ') || null;
    };

    // Calculate totals
    const loanAmount = parseFloat((applicationData.mortgageInfo.purchasePrice || '0').replace(/,/g, '')) - 
                       parseFloat((applicationData.mortgageInfo.downPaymentAmount || '0').replace(/,/g, ''));
    
    const totalMonthlyIncome = applicationData.income.employmentIncomes.reduce((sum: number, emp: any) => {
      return sum + parseFloat((emp.monthlyIncome || '0').replace(/,/g, ''));
    }, 0) + applicationData.income.otherIncomes.reduce((sum: number, inc: any) => {
      return sum + parseFloat((inc.amount || '0').replace(/,/g, ''));
    }, 0) + (applicationData.realEstate.properties || []).reduce((sum: number, prop: any) => {
      return sum + (prop.propertyUsage === 'rental' ? parseFloat((prop.monthlyRent || '0').replace(/,/g, '')) : 0);
    }, 0);

    const totalAssets = applicationData.assets.assets.reduce((sum: number, asset: any) => {
      return sum + parseFloat((asset.balance || '0').replace(/,/g, ''));
    }, 0);

    const monthlyLiabilities = (applicationData.realEstate.properties || []).reduce((sum: number, prop: any) => {
      return sum + parseFloat((prop.monthlyExpenses || '0').replace(/,/g, ''));
    }, 0);

    // Get Screening stage ID
    const { data: screeningStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('name', 'Screening')
      .single();

    // Find existing lead by email, phone, or name
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('*, pipeline_stage:pipeline_stages(name)')
      .or(`email.eq.${applicationData.personalInfo.email},phone.eq.${applicationData.personalInfo.cellPhone}`)
      .in('pipeline_stage.name', ['Leads', 'Pending App']);

    const leadData = {
      first_name: applicationData.personalInfo.firstName,
      last_name: applicationData.personalInfo.lastName,
      middle_name: applicationData.personalInfo.middleName || null,
      email: applicationData.personalInfo.email,
      phone: applicationData.personalInfo.cellPhone,
      loan_type: applicationData.loanPurpose === 'purchase' ? 'Purchase' : applicationData.loanPurpose === 'refinance' ? 'Refinance' : 'HELOC',
      property_type: applicationData.mortgageInfo.propertyType,
      occupancy: applicationData.mortgageInfo.occupancy,
      sales_price: parseFloat((applicationData.mortgageInfo.purchasePrice || '0').replace(/,/g, '')),
      loan_amount: loanAmount,
      monthly_pmt_goal: parseFloat((applicationData.mortgageInfo.comfortableMonthlyPayment || '0').replace(/,/g, '')) || null,
      subject_address_1: 'TBD',
      subject_city: applicationData.mortgageInfo.targetLocation.city,
      subject_state: applicationData.mortgageInfo.targetLocation.state,
      subject_zip: applicationData.mortgageInfo.targetLocation.zipCode,
      marital_status: applicationData.personalInfo.maritalStatus,
      residency_type: applicationData.personalInfo.residencyType,
      borrower_current_address: `${applicationData.personalInfo.currentAddress.street}${applicationData.personalInfo.currentAddress.unit ? ' ' + applicationData.personalInfo.currentAddress.unit : ''}, ${applicationData.personalInfo.currentAddress.city}, ${applicationData.personalInfo.currentAddress.state} ${applicationData.personalInfo.currentAddress.zipCode}`,
      dob: applicationData.personalInfo.dateOfBirth,
      fico_score: mapCreditScore(applicationData.personalInfo.estimatedCreditScore),
      military_veteran: applicationData.personalInfo.isUSMilitary,
      time_at_current_address_years: parseInt(applicationData.personalInfo.yearsAtCurrentAddress || '0'),
      time_at_current_address_months: parseInt(applicationData.personalInfo.monthsAtCurrentAddress || '0'),
      total_monthly_income: totalMonthlyIncome,
      assets: totalAssets,
      monthly_liabilities: monthlyLiabilities,
      co_borrower_first_name: applicationData.coBorrowers.coBorrowers[0]?.firstName || null,
      co_borrower_last_name: applicationData.coBorrowers.coBorrowers[0]?.lastName || null,
      co_borrower_email: applicationData.coBorrowers.coBorrowers[0]?.email || null,
      co_borrower_phone: applicationData.coBorrowers.coBorrowers[0]?.phone || null,
      co_borrower_relationship: applicationData.coBorrowers.coBorrowers[0]?.relationship || null,
      decl_primary_residence: applicationData.declarations.find((d: any) => d.id === '1')?.answer ?? null,
      decl_ownership_interest: applicationData.declarations.find((d: any) => d.id === '2')?.answer ?? null,
      decl_seller_affiliation: applicationData.declarations.find((d: any) => d.id === '3')?.answer ?? null,
      decl_borrowing_undisclosed: applicationData.declarations.find((d: any) => d.id === '4')?.answer ?? null,
      demographic_ethnicity: applicationData.demographics.ethnicity === 'hispanic' ? 'Hispanic/Latino' : 
                             applicationData.demographics.ethnicity === 'notHispanic' ? 'Not Hispanic/Latino' : 
                             applicationData.demographics.ethnicity === 'doNotWish' ? 'Prefer not to say' : null,
      demographic_race: formatRace(applicationData.demographics.race),
      demographic_gender: applicationData.demographics.gender === 'male' ? 'Male' : 
                          applicationData.demographics.gender === 'female' ? 'Female' : 
                          applicationData.demographics.gender === 'doNotWish' ? 'Prefer not to say' : null,
      pipeline_stage_id: screeningStage?.id,
    };

    const today = new Date().toISOString().split('T')[0];

    if (existingLeads && existingLeads.length > 0) {
      // Update existing lead and move to Screening
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...leadData,
          app_complete_at: today,
        })
        .eq('id', existingLeads[0].id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create new lead in Screening (triggers will set account_id if not provided)
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          ...leadData,
          app_complete_at: today,
          created_by: user?.id || null,
          account_id: null // Will be set by trigger if needed
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Task Automations
  async getTaskAutomations() {
    const { data, error } = await supabase
      .from('task_automations')
      .select(`
        *,
        assigned_user:users!task_automations_assigned_to_user_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Get execution counts and last run time for each automation
    if (data) {
      const automationsWithCounts = await Promise.all(
        data.map(async (automation) => {
          const { count, error: countError } = await supabase
            .from('task_automation_executions')
            .select('*', { count: 'exact', head: true })
            .eq('automation_id', automation.id)
            .eq('success', true);
          
          // Get last execution time
          const { data: lastExecution, error: lastError } = await supabase
            .from('task_automation_executions')
            .select('executed_at')
            .eq('automation_id', automation.id)
            .order('executed_at', { ascending: false })
            .limit(1)
            .single();
          
          return {
            ...automation,
            execution_count: countError ? 0 : (count || 0),
            last_run_at: lastError || !lastExecution ? null : lastExecution.executed_at
          };
        })
      );
      return automationsWithCounts;
    }
    
    return data;
  },

  async getTaskAutomationById(id: string) {
    const { data, error } = await supabase
      .from('task_automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getTaskAutomationExecutions(automationId: string) {
    const { data, error } = await supabase
      .from('task_automation_executions')
      .select(`
        *,
        lead:leads!task_automation_executions_lead_id_fkey(first_name, last_name),
        task:tasks!task_automation_executions_task_id_fkey(title)
      `)
      .eq('automation_id', automationId)
      .order('executed_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createTaskAutomation(automation: any) {
    // Use CRM user ID (users.id), not auth user ID
    const crmUserId = await getCurrentCrmUserId();
    
    const { data, error } = await supabase
      .from('task_automations')
      .insert({
        ...automation,
        created_by: crmUserId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTaskAutomation(id: string, automation: any) {
    const { data, error } = await supabase
      .from('task_automations')
      .update(automation)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTaskAutomation(id: string) {
    const { error } = await supabase
      .from('task_automations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleTaskAutomationStatus(id: string, isActive: boolean) {
    const { error } = await supabase
      .from('task_automations')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  },

  async triggerTaskAutomation(automationId: string) {
    const { data, error } = await supabase.functions.invoke('trigger-task-automation', {
      body: { automationId }
    });
    
    if (error) throw error;
    return data;
  },

  // Agent Call Logs
  async createAgentCallLog(agentId: string, summary: string, loggedBy: string, logType?: 'call' | 'meeting' | 'broker_open', meetingLocation?: string, loggedAt?: string, callType?: string, leadId?: string) {
    const { data, error} = await supabase
      .from('agent_call_logs')
      .insert({
        agent_id: agentId,
        summary,
        logged_by: loggedBy,
        logged_at: loggedAt || new Date().toISOString(),
        log_type: logType || 'call',
        meeting_location: meetingLocation || null,
        call_type: callType || null,
        lead_id: leadId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAgentCallLogs(agentId: string, limit = 10) {
    const { data, error } = await supabase
      .from('agent_call_logs')
      .select(`
        *,
        users!agent_call_logs_logged_by_fkey(id, first_name, last_name)
      `)
      .eq('agent_id', agentId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async updateAgentCallLog(
    logId: string, 
    updates: { 
      summary?: string; 
      meeting_location?: string; 
      call_type?: string;
      log_type?: 'call' | 'meeting' | 'broker_open';
    }
  ) {
    const { data, error } = await supabase
      .from('agent_call_logs')
      .update(updates)
      .eq('id', logId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Log not found or you do not have permission to update it.');
    return data;
  },

  async deleteAgentCallLog(logId: string) {
    const { error } = await supabase
      .from('agent_call_logs')
      .delete()
      .eq('id', logId);

    if (error) throw error;
  },

  // Lead Conditions operations
  async getLeadConditions(leadId: string) {
    const { data, error } = await supabase
      .from('lead_conditions')
      .select(`
        *,
        assigned_user:users!lead_conditions_assigned_to_fkey(first_name, last_name, email),
        created_user:users!lead_conditions_created_by_fkey(first_name, last_name)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createLeadCondition(condition: any) {
    // Use CRM user ID (users.id), not auth user ID
    const crmUserId = await getCurrentCrmUserId();
    const { data, error } = await supabase
      .from('lead_conditions')
      .insert({
        ...condition,
        created_by: crmUserId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateLeadCondition(id: string, updates: any) {
    const { data, error } = await supabase
      .from('lead_conditions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteLeadCondition(id: string) {
    const { error } = await supabase
      .from('lead_conditions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getConditionStatusHistory(conditionId: string) {
    const { data, error } = await supabase
      .from('lead_condition_status_history')
      .select('*')
      .eq('condition_id', conditionId)
      .order('changed_at', { ascending: true });
    
    if (error) throw error;
    
    // Fetch user details separately for each entry
    if (data && data.length > 0) {
      const userIds = [...new Set(data.filter(d => d.changed_by).map(d => d.changed_by))];
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        return data.map(entry => ({
          ...entry,
          changed_user: entry.changed_by ? usersMap.get(entry.changed_by) || null : null
        }));
      }
    }
    
    return data || [];
  },

  // Lead operations
  async getLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users!fk_leads_teammate_assigned(*),
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }
      
      // Handle null relations to prevent transformation errors
      return data?.map(lead => ({
        ...lead,
        teammate: lead.teammate || null,
        pipeline_stage: lead.pipeline_stage || null,
        buyer_agent: lead.buyer_agent || null
      })) || [];
    } catch (error) {
      console.error('Failed to load leads:', error);
      throw new Error('Failed to load leads. Please try again.');
    }
  },

  async getNewLeads() {
    try {
      // Get the "Leads" pipeline stage ID
      const { data: leadsStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('name', 'Leads')
        .single();

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users!fk_leads_teammate_assigned(*),
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone)
        `)
        .eq('pipeline_stage_id', leadsStage?.id || '')
        .is('deleted_at', null) // Exclude soft-deleted leads
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching new leads:', error);
        throw error;
      }
      
      // Get earliest task due dates for all leads
      const leadIds = data?.map(lead => lead.id) || [];
      let taskDueDates: Record<string, string | null> = {};

      if (leadIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('borrower_id, due_date')
          .in('borrower_id', leadIds)
          .is('deleted_at', null)
          .neq('status', 'Done')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true });
        
        if (tasksData) {
          for (const task of tasksData) {
            if (task.borrower_id && task.due_date) {
              if (!taskDueDates[task.borrower_id] || task.due_date < taskDueDates[task.borrower_id]!) {
                taskDueDates[task.borrower_id] = task.due_date;
              }
            }
          }
        }
      }
      
      // Handle null relations and add earliest_task_due_date
      return data?.map(lead => ({
        ...lead,
        teammate: lead.teammate || null,
        pipeline_stage: lead.pipeline_stage || null,
        buyer_agent: lead.buyer_agent || null,
        earliest_task_due_date: taskDueDates[lead.id] || null
      })) || [];
    } catch (error) {
      console.error('Failed to load new leads:', error);
      throw new Error('Failed to load new leads. Please try again.');
    }
  },

  async getLeadsWithTaskDueDates() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users!fk_leads_teammate_assigned(*),
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone),
          tasks(due_date)
        `)
        .eq('pipeline_stage_id', 'c54f417b-3f67-43de-80f5-954cf260d571')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching leads with task due dates:', error);
        throw error;
      }
      
      // Handle task due dates and flatten the structure
      return data?.map(lead => ({
        ...lead,
        teammate: lead.teammate || null,
        pipeline_stage: lead.pipeline_stage || null,
        buyer_agent: lead.buyer_agent || null,
        task_due_date: lead.tasks?.[0]?.due_date || null
      })) || [];
    } catch (error) {
      console.error('Failed to load leads with task due dates:', error);
      // Fallback to regular leads if task join fails
      return this.getLeads();
    }
  },

  async createLead(lead: Omit<LeadInsert, 'account_id' | 'created_by'>) {
    try {
      console.log('[DEBUG] Creating lead with data:', lead);

      // Get current user's session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('No active user session');

      // Resolve account_id robustly
      let accountId: string | null = null;

      // Try RPC first
      const { data: rpcAccount, error: rpcErr } = await supabase.rpc('get_user_account_id', {
        user_uuid: userId,
      });
      if (rpcErr) {
        console.warn('[DEBUG] RPC get_user_account_id error (will fallback):', rpcErr);
      }
      if (rpcAccount) accountId = rpcAccount as unknown as string;

      // Fallback to profiles table
      if (!accountId) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', userId)
          .single();
        if (profileErr) {
          console.warn('[DEBUG] profiles fallback error (may still proceed):', profileErr);
        }
        accountId = (profile as any)?.account_id || null;
      }

      if (!accountId) {
        throw new Error('Your user is missing an account_id. Please create a profile or set an account.');
      }

      // Local date formatter YYYY-MM-DD
      const formatLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Resolve teammate_assigned safely (avoid FK violations)
      let teammateId: string | null = null;
      const { data: teammateUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (teammateUser?.id) teammateId = teammateUser.id;

      // Prepare input date
      const inputLeadOnDate: any = (lead as any).lead_on_date;

      // Get the "Leads" pipeline stage ID
      const { data: leadsStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('name', 'Leads')
        .single();

      // Build insert payload explicitly
      const leadPayload: any = {
        ...lead,
        created_by: userId,
        account_id: accountId,
        teammate_assigned: (lead as any).teammate_assigned ?? teammateId ?? null,
        pipeline_stage_id: leadsStage?.id || null, // Set to "Leads" stage
        pipeline_section: null, // Don't put in Active section
        lead_on_date:
          inputLeadOnDate instanceof Date
            ? formatLocalDate(inputLeadOnDate)
            : (lead as any).lead_on_date || formatLocalDate(new Date()),
        task_eta: (lead as any).task_eta || formatLocalDate(new Date()),
        source: (lead as any).source || null,
        referred_via: (lead as any).referred_via || null,
        status: (lead as any).status || 'Working on it',
      };

      console.log('[DEBUG] Inserting lead with payload:', leadPayload);

      // Insert and return minimal shape to avoid relationship ambiguity
      const { data, error } = await supabase
        .from('leads')
        .insert(leadPayload)
        .select('*')
        .single();

      if (error) throw error;
      console.log('[DEBUG] Lead created successfully:', data);

      // Create stage_history record for the new lead
      try {
        const { error: stageHistoryError } = await supabase
          .from('stage_history')
          .insert({
            lead_id: data.id,
            from_stage_id: null, // New lead has no previous stage
            to_stage_id: data.pipeline_stage_id,
            changed_by: userId,
            changed_at: new Date().toISOString(),
          });

        if (stageHistoryError) {
          console.warn('[DEBUG] Failed to create stage_history record:', stageHistoryError);
          // Don't throw - lead was created successfully, just log the warning
        } else {
          console.log('[DEBUG] Stage history record created for new lead');
        }
      } catch (stageHistoryErr) {
        console.warn('[DEBUG] Stage history creation error:', stageHistoryErr);
      }

      return data;
    } catch (error: any) {
      console.error('[DEBUG] createLead error:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      throw error;
    }
  },

  async updateLead(id: string, updates: LeadUpdate) {
    try {
      console.log('[DEBUG] updateLead called', { id, updates });
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[DEBUG] updateLead error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          id,
          updates,
        });
        throw new Error(`Update failed: ${error.message}${error.details ? ' - ' + error.details : ''}`);
      }

      console.log('[DEBUG] updateLead success', data);
      return data;
    } catch (e: any) {
      console.error('[DEBUG] updateLead exception:', e);
      throw e;
    }
  },

  deleteLead: async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('[DEBUG] Soft delete lead:', {
        leadId: id,
        userId: user.id
      });

      // Step 1: Check for open tasks (not soft-deleted AND not Done)
      const { data: openTasks, error: openTasksError } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('borrower_id', id)
        .is('deleted_at', null)
        .neq('status', 'Done');

      if (!openTasksError && openTasks && openTasks.length > 0) {
        const taskTitles = openTasks.slice(0, 3).map(t => `"${t.title}"`).join(', ');
        const moreCount = openTasks.length > 3 ? ` and ${openTasks.length - 3} more` : '';
        throw new Error(`This lead has ${openTasks.length} open task(s): ${taskTitles}${moreCount}. Please complete or delete them first.`);
      }

      // Step 2: Get CRM user ID for deleted_by tracking
      // Using raw query to avoid TypeScript deep instantiation issues
      const { data: crmUserData } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .limit(1);
      const crmUserId = crmUserData?.[0]?.id || null;

      // Step 3: Soft delete the lead (set deleted_at and deleted_by)
      const { error } = await supabase
        .from('leads')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: crmUserId
        })
        .eq('id', id);

      if (error) {
        console.error('[DEBUG] Soft delete lead error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('[DEBUG] Lead soft-deleted successfully');
    } catch (error: any) {
      console.error('[DEBUG] DeleteLead function error:', error);
      throw error;
    }
  },

  // Task operations
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, description, notes, due_date, status, priority, assignee_id, borrower_id, task_order, created_at, updated_at, updated_by, created_by, completion_requirement_type, reviewed, reviewed_at,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        updater:users!tasks_updated_by_fkey(id, first_name, last_name, email),
        borrower:leads!tasks_borrower_id_fkey(
          id, 
          first_name, 
          last_name,
          phone,
          loan_status,
          buyer_agent_id,
          listing_agent_id,
          pipeline_stage:pipeline_stages(id, name, order_index)
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Fetch all task assignees
    const taskIds = data?.map(t => t.id) || [];
    const { data: taskAssignees } = await supabase
      .from('task_assignees')
      .select('task_id, user_id')
      .in('task_id', taskIds);
    
    // Create a map of task_id -> user_ids[]
    const assigneesMap = new Map<string, string[]>();
    taskAssignees?.forEach(ta => {
      if (!assigneesMap.has(ta.task_id)) {
        assigneesMap.set(ta.task_id, []);
      }
      assigneesMap.get(ta.task_id)!.push(ta.user_id);
    });
    
    // Fetch all unique buyer agent and listing agent IDs
    const buyerAgentIds = new Set(data?.map(t => t.borrower?.buyer_agent_id).filter(Boolean) || []);
    const listingAgentIds = new Set(data?.map(t => t.borrower?.listing_agent_id).filter(Boolean) || []);
    
    // Fetch buyer agents in bulk
    const { data: buyerAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, phone')
      .in('id', Array.from(buyerAgentIds));
    
    // Fetch listing agents in bulk (from buyer_agents table)
    const { data: listingAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, phone')
      .in('id', Array.from(listingAgentIds));
    
    // Create lookup maps
    const buyerAgentMap = new Map(buyerAgents?.map(a => [a.id, a]) || []);
    const listingAgentMap = new Map(listingAgents?.map(a => [a.id, a]) || []);
    
    // Manually attach agent data and assignees to tasks
    const tasksWithAgents = data?.map((task: any) => ({
      ...task,
      lead: task.borrower, // Add lead reference for validation
      buyer_agent: task.borrower?.buyer_agent_id ? buyerAgentMap.get(task.borrower.buyer_agent_id) : null,
      listing_agent: task.borrower?.listing_agent_id ? listingAgentMap.get(task.borrower.listing_agent_id) : null,
      assignee_ids: assigneesMap.get(task.id) || (task.assignee_id ? [task.assignee_id] : []),
    }));
    
    return tasksWithAgents;
  },

  async getLeadTasks(leadId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id, title, description, notes, due_date, status, priority, assignee_id, borrower_id, task_order, created_at, updated_at, created_by, completion_requirement_type, reviewed, reviewed_at,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        borrower:leads!tasks_borrower_id_fkey(
          id, 
          first_name, 
          last_name,
          phone,
          buyer_agent_id,
          listing_agent_id
        )
      `)
      .eq('borrower_id', leadId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false });
    
    if (error) throw error;

    // Fetch agent data similar to getTasks()
    const buyerAgentIds = new Set(data?.map(t => t.borrower?.buyer_agent_id).filter(Boolean) || []);
    const listingAgentIds = new Set(data?.map(t => t.borrower?.listing_agent_id).filter(Boolean) || []);

    const { data: buyerAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, phone')
      .in('id', Array.from(buyerAgentIds));

    const { data: listingAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, phone')
      .in('id', Array.from(listingAgentIds));

    const buyerAgentMap = new Map(buyerAgents?.map(a => [a.id, a]) || []);
    const listingAgentMap = new Map(listingAgents?.map(a => [a.id, a]) || []);

    const tasksWithAgents = data?.map((task: any) => ({
      ...task,
      lead: task.borrower,
      buyer_agent: task.borrower?.buyer_agent_id ? buyerAgentMap.get(task.borrower.buyer_agent_id) : null,
      listing_agent: task.borrower?.listing_agent_id ? listingAgentMap.get(task.borrower.listing_agent_id) : null,
    }));

    return tasksWithAgents;
  },

  async getDeletedTasks() {
    // First get the deleted tasks
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        borrower:leads!tasks_borrower_id_fkey(id, first_name, last_name)
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) throw error;
    
    // Now get the deleted_by user info by looking up auth_user_id
    if (data && data.length > 0) {
      const deletedByIds = [...new Set(data.filter(t => t.deleted_by).map(t => t.deleted_by))];
      
      if (deletedByIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, auth_user_id, first_name, last_name, email')
          .in('auth_user_id', deletedByIds);
        
        const userMap = new Map(usersData?.map(u => [u.auth_user_id, u]) || []);
        
        return data.map(task => ({
          ...task,
          deleted_by_user: task.deleted_by ? userMap.get(task.deleted_by) || null : null
        }));
      }
    }
    
    return data?.map(task => ({ ...task, deleted_by_user: null })) || [];
  },

  async createTask(task: TaskInsert) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        borrower:leads!tasks_borrower_id_fkey(id, first_name, last_name)
      `)
      .single();
    
    if (error) {
      console.error('Task creation error:', error);
      throw error;
    }
    return data;
  },

  async createTaskActivityLog(taskData: {
    lead_id: string;
    task_id: string;
    task_title: string;
    assignee_name?: string;
    due_date?: string;
    author_id: string;
  }) {
    const noteBody = `Task created: ${taskData.task_title}${
      taskData.assignee_name ? `\nAssigned to: ${taskData.assignee_name}` : ''
    }${taskData.due_date ? `\nDue: ${new Date(taskData.due_date).toLocaleDateString()}` : ''}`;
    
    const { data, error } = await supabase
      .from('notes')
      .insert({
        lead_id: taskData.lead_id,
        author_id: taskData.author_id,
        body: noteBody,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Task activity log error:', error);
      throw error;
    }
    return data;
  },

  async updateTask(id: string, updates: TaskUpdate) {
    // Validate priority and status enum values before sending to Postgres
    const processedUpdates = { ...updates };
    
    // Validate priority if present - must match task_priority enum
    if ('priority' in processedUpdates && processedUpdates.priority !== undefined && processedUpdates.priority !== null) {
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!validPriorities.includes(processedUpdates.priority as string)) {
        throw new Error(`Invalid priority value: ${processedUpdates.priority}. Must be one of: ${validPriorities.join(', ')}`);
      }
    }
    
    // Validate status if present - must match task_status enum
    if ('status' in processedUpdates && processedUpdates.status !== undefined && processedUpdates.status !== null) {
      const validStatuses = ['To Do', 'In Progress', 'Done', 'Working on it', 'Need help'];
      if (!validStatuses.includes(processedUpdates.status as string)) {
        throw new Error(`Invalid status value: ${processedUpdates.status}. Must be one of: ${validStatuses.join(', ')}`);
      }
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...processedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(id, first_name, last_name, pipeline_stage:pipeline_stages(id, name, order_index)),
        updater:users!tasks_updated_by_fkey(id, first_name, last_name, email)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async autoCompleteTasksAfterCall(
    leadId: string, 
    callType: 'log_call_buyer_agent' | 'log_call_listing_agent' | 'log_call_borrower',
    loggedByUserId: string
  ): Promise<{ completedCount: number; taskTitles: string[] }> {
    // Find tasks for this lead with matching completion_requirement_type
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id, created_at')
      .eq('borrower_id', leadId)
      .eq('completion_requirement_type', callType)
      .neq('status', 'Done')
      .is('deleted_at', null);

    if (error || !tasks || tasks.length === 0) {
      return { completedCount: 0, taskTitles: [] };
    }

    // Filter tasks created within last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTasks = tasks.filter(task => {
      const taskCreatedAt = new Date(task.created_at).getTime();
      return taskCreatedAt >= thirtyDaysAgo;
    });

    if (recentTasks.length === 0) {
      return { completedCount: 0, taskTitles: [] };
    }

    // Update all matching tasks to "Done"
    const taskIds = recentTasks.map(t => t.id);
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'Done' })
      .in('id', taskIds);

    if (updateError) {
      console.error('Error auto-completing tasks:', updateError);
      return { completedCount: 0, taskTitles: [] };
    }

    // Check if lead needs a placeholder task after auto-completion
    if (recentTasks.length > 0) {
      this.checkAndCreateNoOpenTaskFound(leadId);
    }

    return {
      completedCount: recentTasks.length,
      taskTitles: recentTasks.map(t => t.title)
    };
  },

  async autoCompleteTasksAfterNote(
    leadId: string,
    loggedByUserId: string
  ): Promise<{ completedCount: number; taskTitles: string[] }> {
    // Find tasks for this lead with log_note_borrower requirement
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, assignee_id, created_at')
      .eq('borrower_id', leadId)
      .eq('completion_requirement_type', 'log_note_borrower')
      .neq('status', 'Done')
      .is('deleted_at', null);

    if (error || !tasks || tasks.length === 0) {
      return { completedCount: 0, taskTitles: [] };
    }

    // Filter tasks created within last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTasks = tasks.filter(task => {
      const taskCreatedAt = new Date(task.created_at).getTime();
      return taskCreatedAt >= thirtyDaysAgo;
    });

    if (recentTasks.length === 0) {
      return { completedCount: 0, taskTitles: [] };
    }

    // Update all matching tasks to "Done"
    const taskIds = recentTasks.map(t => t.id);
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'Done' })
      .in('id', taskIds);

    if (updateError) {
      console.error('Error auto-completing tasks:', updateError);
      return { completedCount: 0, taskTitles: [] };
    }

    // Check if lead needs a placeholder task after auto-completion
    if (recentTasks.length > 0) {
      this.checkAndCreateNoOpenTaskFound(leadId);
    }

    return {
      completedCount: recentTasks.length,
      taskTitles: recentTasks.map(t => t.title)
    };
  },

  // Task Assignees operations
  async getTaskAssignees(taskId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);
    
    if (error) throw error;
    return data?.map(ta => ta.user_id) || [];
  },

  async updateTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
    // Delete all existing assignees for this task
    const { error: deleteError } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId);
    
    if (deleteError) throw deleteError;
    
    // Insert new assignees
    if (userIds.length > 0) {
      const { error: insertError } = await supabase
        .from('task_assignees')
        .insert(userIds.map(userId => ({ task_id: taskId, user_id: userId })));
      
      if (insertError) throw insertError;
    }
    
    // Also update the legacy assignee_id field with the first assignee for backwards compatibility
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        assignee_id: userIds.length > 0 ? userIds[0] : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    
    if (updateError) throw updateError;
  },

  async autoCompleteTasksAfterFieldUpdate(
    leadId: string,
    fieldName: string,
    fieldValue: string | null,
    loggedByUserId: string
  ): Promise<{ completedCount: number; taskTitles: string[] }> {
    // Find tasks that might be auto-completed by this field update
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, completion_requirement_type, created_at')
      .eq('borrower_id', leadId)
      .neq('status', 'Done')
      .is('deleted_at', null);

    if (error || !tasks || tasks.length === 0) {
      return { completedCount: 0, taskTitles: [] };
    }

    // Filter tasks created within last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTasks = tasks.filter(task => {
      const taskCreatedAt = new Date(task.created_at).getTime();
      return taskCreatedAt >= thirtyDaysAgo;
    });

    // Find tasks that should be completed by this field update
    const tasksToComplete = recentTasks.filter(task => {
      const req = task.completion_requirement_type;
      if (!req) return false;

      // Check field_populated requirements
      if (req.startsWith('field_populated:')) {
        const reqField = req.split(':')[1];
        return reqField === fieldName && fieldValue !== null && fieldValue !== '';
      }

      // Check field_value requirements
      if (req.startsWith('field_value:')) {
        const [, fieldConfig] = req.split(':');
        const [reqField, valuesStr] = fieldConfig.split('=');
        if (reqField !== fieldName) return false;
        const allowedValues = valuesStr.split(',');
        return allowedValues.includes(fieldValue || '');
      }

      return false;
    });

    if (tasksToComplete.length === 0) {
      return { completedCount: 0, taskTitles: [] };
    }

    // Update matching tasks to "Done"
    const taskIds = tasksToComplete.map(t => t.id);
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'Done' })
      .in('id', taskIds);

    if (updateError) {
      console.error('Error auto-completing tasks:', updateError);
      return { completedCount: 0, taskTitles: [] };
    }

    // Check if lead needs a placeholder task after auto-completion
    if (tasksToComplete.length > 0) {
      this.checkAndCreateNoOpenTaskFound(leadId);
    }

    return {
      completedCount: tasksToComplete.length,
      taskTitles: tasksToComplete.map(t => t.title)
    };
  },

  // Check and create "No open task found" placeholder task for a lead
  async checkAndCreateNoOpenTaskFound(leadId: string): Promise<void> {
    if (!leadId) return;

    try {
      console.log('[checkAndCreateNoOpenTaskFound] Checking lead:', leadId);
      const { data, error } = await supabase.functions.invoke('check-open-tasks', {
        body: { leadId }
      });

      if (error) {
        console.error('[checkAndCreateNoOpenTaskFound] Error:', error);
      } else {
        console.log('[checkAndCreateNoOpenTaskFound] Result:', data);
      }
    } catch (err) {
      console.error('[checkAndCreateNoOpenTaskFound] Failed:', err);
    }
  },

  // Contact operations
  async getContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createContact(contact: ContactInsert) {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  // Pipeline stages
  async getPipelineStages() {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index');
    
    if (error) throw error;
    return data;
  },

  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('first_name');
    
    if (error) throw error;
    return data;
  },

  // Activity logs
  async createNote(note: NoteInsert) {
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select(`
        *,
        author:users(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createCallLog(callLog: CallLogInsert) {
    const { data, error } = await supabase
      .from('call_logs')
      .insert(callLog)
      .select(`
        *,
        user:users(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createSmsLog(smsLog: SmsLogInsert) {
    const { data, error } = await supabase
      .from('sms_logs')
      .insert(smsLog)
      .select(`
        *,
        user:users(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createEmailLog(emailLog: EmailLogInsert) {
    const { data, error } = await supabase
      .from('email_logs')
      .insert(emailLog)
      .select(`
        *,
        user:users(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getLeadActivities(leadId: string) {
    const [notes, callLogs, smsLogs, emailLogs, tasks, statusChanges, agentCallLogs] = await Promise.all([
      supabase
        .from('notes')
        .select(`
          *,
          author:users(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('call_logs')
        .select(`
          *,
          user:users(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('sms_logs')
        .select(`
          *,
          user:users(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('email_logs')
        .select(`
          *,
          user:users(*),
          agent:buyer_agents(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('tasks')
        .select(`
          *,
          user:users!tasks_created_by_fkey(*)
        `)
        .eq('borrower_id', leadId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('status_change_logs')
        .select(`
          *,
          changed_by_user:users!status_change_logs_changed_by_fkey(id, first_name, last_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      
      // Agent call logs associated with this lead
      supabase
        .from('agent_call_logs')
        .select(`
          *,
          user:users!agent_call_logs_logged_by_fkey(*),
          agent:buyer_agents!agent_call_logs_agent_id_fkey(id, first_name, last_name)
        `)
        .eq('lead_id', leadId)
        .order('logged_at', { ascending: false }),
    ]);

    // Fetch completion info from audit_log for completed tasks
    const completedTaskIds = (tasks.data || [])
      .filter(task => task.status === 'Done')
      .map(task => task.id);

    let completionInfo: Record<string, { changed_by: string; changed_at: string; user: any }> = {};
    if (completedTaskIds.length > 0) {
      const { data: auditData } = await supabase
        .from('audit_log')
        .select(`
          item_id,
          changed_by,
          changed_at,
          changed_by_user:users!audit_log_changed_by_fkey(*)
        `)
        .eq('table_name', 'tasks')
        .eq('action', 'update')
        .in('item_id', completedTaskIds)
        .order('changed_at', { ascending: false });
      
      if (auditData) {
        // Create a map of task_id -> latest completion info
        completionInfo = auditData.reduce((acc, entry) => {
          // Only keep the first (most recent) entry for each task
          if (!acc[entry.item_id] && entry.changed_by) {
            acc[entry.item_id] = {
              changed_by: entry.changed_by,
              changed_at: entry.changed_at,
              user: entry.changed_by_user
            };
          }
          return acc;
        }, {} as Record<string, any>);
      }
    }

    const activities = [
      ...(notes.data || []).map(note => ({ ...note, type: 'note' as const })),
      ...(callLogs.data || []).map(log => ({ ...log, type: 'call' as const })),
      ...(smsLogs.data || []).map(log => ({ ...log, type: 'sms' as const })),
      ...(emailLogs.data || []).map(log => ({ ...log, type: 'email' as const })),
      ...(tasks.data || []).map(task => {
        const completion = completionInfo[task.id];
        return {
          ...task, 
          type: 'task' as const,
          body: `${task.title}\n${task.description || ''}`,
          author: task.user,
          completed_by_user: completion?.user || null,
          completed_at: completion?.changed_at || null
        };
      }),
      ...(statusChanges.data || []).map(change => ({
        ...change,
        type: 'status_change' as const,
        body: `Status changed from "${change.old_value || 'None'}" to "${change.new_value}"`,
      })),
      // Agent call logs associated with this lead
      ...(agentCallLogs.data || []).map(log => ({
        ...log,
        type: 'agent_call' as const,
        notes: log.summary,
        created_at: log.logged_at, // Use logged_at as the timestamp for sorting
        agent_name: log.agent ? `${log.agent.first_name} ${log.agent.last_name}` : 'Unknown Agent',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return activities;
  },

  // Update note
  async updateNote(noteId: string, updates: { body?: string }) {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete note
  async deleteNote(noteId: string) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
  },

  // Update call log
  async updateCallLog(callLogId: string, updates: { notes?: string }) {
    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', callLogId)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete call log
  async deleteCallLog(callLogId: string) {
    const { error } = await supabase
      .from('call_logs')
      .delete()
      .eq('id', callLogId);
    
    if (error) throw error;
  },

  // Update SMS log
  async updateSmsLog(smsLogId: string, updates: { body?: string }) {
    const { data, error } = await supabase
      .from('sms_logs')
      .update(updates)
      .eq('id', smsLogId)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete SMS log
  async deleteSmsLog(smsLogId: string) {
    const { error } = await supabase
      .from('sms_logs')
      .delete()
      .eq('id', smsLogId);
    
    if (error) throw error;
  },

  // Update email log
  async updateEmailLog(emailLogId: string, updates: { body?: string; subject?: string; snippet?: string }) {
    const { data, error } = await supabase
      .from('email_logs')
      .update(updates)
      .eq('id', emailLogId)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete email log
  async deleteEmailLog(emailLogId: string) {
    const { error } = await supabase
      .from('email_logs')
      .delete()
      .eq('id', emailLogId);
    
    if (error) throw error;
  },

  // Buyer Agent operations
  async getBuyerAgents() {
    const allAgents: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('*')
        .is('deleted_at', null)
        .order('first_name')
        .range(from, from + batchSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allAgents.push(...data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    return allAgents;
  },

  async createBuyerAgent(agent: BuyerAgentInsert) {
    const { data, error } = await supabase
      .from('buyer_agents')
      .insert(agent)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateBuyerAgent(id: string, updates: any) {
    const { data, error } = await supabase
      .from('buyer_agents')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBuyerAgentById(id: string) {
    const { data, error } = await supabase
      .from('buyer_agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // DELETED FUNCTIONS - Tables no longer exist (team_assignments, lead_external_contacts, lead_dates)
  // These functions have been removed as the underlying tables were deleted in migration

  async deleteTask(taskId: string) {
    // Get current user
    const { data: sessionData, error: authError } = await supabase.auth.getSession();
    if (authError || !sessionData?.session?.user) {
      throw new Error('No authenticated session found');
    }

    // Soft delete by setting deleted_at and deleted_by
    const { error } = await supabase
      .from('tasks')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: sessionData.session.user.id
      })
      .eq('id', taskId);

    if (error) throw error;
  },

  async restoreTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .update({
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', taskId);

    if (error) throw error;
  },

  async permanentlyDeleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  // ===== DELETED LEADS =====
  async getDeletedLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        deleted_by_user:users!deleted_by(id, first_name, last_name, email)
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) {
      console.error('[getDeletedLeads] Error:', error);
      throw error;
    }
    return data || [];
  },

  async softDeleteLead(leadId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get CRM user ID for deleted_by tracking (leads.deleted_by references users.id, not auth.users.id)
    const { data: crmUserData } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('auth_id', user?.id)
      .limit(1);
    const crmUserId = crmUserData?.[0]?.id || null;
    
    const { error } = await supabase
      .from('leads')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: crmUserId
      })
      .eq('id', leadId);

    if (error) throw error;
  },

  async restoreLead(leadId: string) {
    const { error } = await supabase
      .from('leads')
      .update({
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', leadId);

    if (error) throw error;
  },

  async permanentlyDeleteLead(leadId: string) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;
  },

  // ===== DELETED BUYER AGENTS =====
  async getDeletedBuyerAgents() {
    // Simple query without FK embed that may fail due to missing/mismatched FK constraint
    const { data, error } = await supabase
      .from('buyer_agents')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deleted buyer agents:', error);
      throw error;
    }
    return data || [];
  },

  async softDeleteBuyerAgent(agentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('buyer_agents')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id
      })
      .eq('id', agentId);

    if (error) throw error;
  },

  async restoreBuyerAgent(agentId: string) {
    const { error } = await supabase
      .from('buyer_agents')
      .update({
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', agentId);

    if (error) throw error;
  },

  async permanentlyDeleteBuyerAgent(agentId: string) {
    const { error } = await supabase
      .from('buyer_agents')
      .delete()
      .eq('id', agentId);

    if (error) throw error;
  },

  // ===== DELETED LENDERS =====
  async getDeletedLenders() {
    // Simple query without FK embed that may fail due to missing/mismatched FK constraint
    const { data, error } = await supabase
      .from('lenders')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deleted lenders:', error);
      throw error;
    }
    return data || [];
  },

  async softDeleteLender(lenderId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('lenders')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id
      })
      .eq('id', lenderId);

    if (error) throw error;
  },

  async restoreLender(lenderId: string) {
    const { error } = await supabase
      .from('lenders')
      .update({
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', lenderId);

    if (error) throw error;
  },

  async permanentlyDeleteLender(lenderId: string) {
    const { error } = await supabase
      .from('lenders')
      .delete()
      .eq('id', lenderId);

    if (error) throw error;
  },

  async getActiveLoans() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          lender:contacts!fk_leads_lender(id, first_name, last_name, company, email),
          approved_lender:lenders!fk_leads_approved_lender(id, lender_name, lender_type),
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone),
          listing_agent:buyer_agents!fk_leads_listing_agent(id, first_name, last_name, brokerage, email),
          teammate:users!fk_leads_teammate_assigned(id, first_name, last_name, email)
        `)
        .eq('pipeline_stage_id', '76eb2e82-e1d9-4f2d-a57d-2120a25696db') // Active stage only
        .is('deleted_at', null) // Exclude soft-deleted leads
        .order('close_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Embed error, using fallback query:', error);
        // Fallback: query without embeds
        const fallbackResult = await supabase
          .from('leads')
          .select('*')
          .in('pipeline_section', ['Incoming', 'Live', 'On Hold'])
          .order('close_date', { ascending: true, nullsFirst: false });
        
        if (fallbackResult.error) throw fallbackResult.error;
        
        return fallbackResult.data?.map(loan => ({
          ...loan,
          buyer_agent: null,
          lender: null,
          approved_lender: null,
          listing_agent: null,
          teammate: null,
          earliest_task_due_date: null
        })) || [];
      }
      
      // Fetch tasks for all active loans (open tasks only)
      const leadIds = data?.map(loan => loan.id) || [];
      let taskDueDates: Record<string, string | null> = {};
      let tasksByLead: Record<string, any[]> = {};
      
      if (leadIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, borrower_id, due_date, title, status')
          .in('borrower_id', leadIds)
          .is('deleted_at', null)
          .neq('status', 'Done')
          .order('due_date', { ascending: true });
        
        // Group by borrower_id and get earliest date + full task list
        if (tasksData) {
          for (const task of tasksData) {
            if (task.borrower_id) {
              // Track earliest due date
              if (task.due_date) {
                if (!taskDueDates[task.borrower_id] || task.due_date < taskDueDates[task.borrower_id]!) {
                  taskDueDates[task.borrower_id] = task.due_date;
                }
              }
              // Track all tasks for this lead
              if (!tasksByLead[task.borrower_id]) {
                tasksByLead[task.borrower_id] = [];
              }
              tasksByLead[task.borrower_id].push(task);
            }
          }
        }
      }
      
      return data?.map(loan => ({
        ...loan,
        buyer_agent: Array.isArray((loan as any).buyer_agent) ? (loan as any).buyer_agent[0] || null : (loan as any).buyer_agent || null,
        lender: Array.isArray((loan as any).lender) ? (loan as any).lender[0] || null : (loan as any).lender || null,
        approved_lender: Array.isArray((loan as any).approved_lender) ? (loan as any).approved_lender[0] || null : (loan as any).approved_lender || null,
        listing_agent: Array.isArray((loan as any).listing_agent) ? (loan as any).listing_agent[0] || null : (loan as any).listing_agent || null,
        teammate: Array.isArray((loan as any).teammate) ? (loan as any).teammate[0] || null : (loan as any).teammate || null,
        earliest_task_due_date: taskDueDates[loan.id] || null,
        tasks: tasksByLead[loan.id] || [],
      })) || [];
    } catch (error: any) {
      console.error('Failed to load active loans:', error);
      throw new Error(error?.message || 'Failed to load active loans.');
    }
  },

  async getPastClientLoans() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          lender:contacts!fk_leads_lender(id, first_name, last_name, company, email),
          approved_lender:lenders!fk_leads_approved_lender(id, lender_name, lender_type),
          buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone),
          listing_agent:buyer_agents!fk_leads_listing_agent(id, first_name, last_name, brokerage, email),
          teammate:users!fk_leads_teammate_assigned(id, first_name, last_name, email)
        `)
        .eq('pipeline_section', 'Closed')
        .eq('is_closed', true)
        .is('deleted_at', null) // Exclude soft-deleted leads
        .order('closed_at', { ascending: false });

      if (error) {
        console.error('Embed error, using fallback query:', error);
        // Fallback: query without embeds
        const fallbackResult = await supabase
          .from('leads')
          .select('*')
          .eq('pipeline_section', 'Closed')
          .eq('is_closed', true)
          .order('closed_at', { ascending: false });
        
        if (fallbackResult.error) throw fallbackResult.error;
        
        return fallbackResult.data?.map(loan => ({
          ...loan,
          buyer_agent: null,
          lender: null,
          approved_lender: null,
          listing_agent: null,
          teammate: null
        })) || [];
      }
      
      return data?.map(loan => ({
        ...loan,
        buyer_agent: Array.isArray((loan as any).buyer_agent) ? (loan as any).buyer_agent[0] || null : (loan as any).buyer_agent || null,
        lender: Array.isArray((loan as any).lender) ? (loan as any).lender[0] || null : (loan as any).lender || null,
        approved_lender: Array.isArray((loan as any).approved_lender) ? (loan as any).approved_lender[0] || null : (loan as any).approved_lender || null,
        listing_agent: Array.isArray((loan as any).listing_agent) ? (loan as any).listing_agent[0] || null : (loan as any).listing_agent || null,
        teammate: Array.isArray((loan as any).teammate) ? (loan as any).teammate[0] || null : (loan as any).teammate || null,
      })) || [];
    } catch (error: any) {
      console.error('Failed to load past client loans:', error);
      throw new Error(error?.message || 'Failed to load past client loans.');
    }
  },

  async getLenders() {
    const { data, error } = await supabase
      .from('lenders')
      .select('*')
      .is('deleted_at', null)
      .order('lender_name');

    if (error) throw error;
    return data;
  },

  async getLenderContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company, email')
      .order('last_name');
    if (error) throw error;
    return data || [];
  },

  // Get all unified contacts from contacts, buyer_agents, lenders, and leads tables
  async getAllUnifiedContacts() {
    try {
      // 1. Fetch from contacts table (include new fields)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*, email_log_id');
      
      // 2. Fetch ALL from buyer_agents table (exclude soft-deleted) using pagination
      // Supabase has a default limit of 1000, so we need to paginate
      let allAgentsData: any[] = [];
      let agentsError = null;
      const pageSize = 1000;
      let offset = 0;
      
      while (true) {
        const { data: agentsBatch, error } = await supabase
          .from('buyer_agents')
          .select('*')
          .is('deleted_at', null)
          .range(offset, offset + pageSize - 1);
        
        if (error) {
          agentsError = error;
          break;
        }
        
        if (!agentsBatch || agentsBatch.length === 0) break;
        
        allAgentsData = [...allAgentsData, ...agentsBatch];
        
        // If we got fewer than pageSize, we've reached the end
        if (agentsBatch.length < pageSize) break;
        
        offset += pageSize;
      }
      
      const agentsData = allAgentsData;
      
      // 3. Fetch from lenders table
      const { data: lendersData, error: lendersError } = await supabase
        .from('lenders')
        .select('*');
      
      // 4. Fetch from leads table
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, pipeline_stage_id');
      
      // Log counts for debugging
      console.log('Master Contact List - Data sources loaded:', {
        contacts: contactsData?.length || 0,
        agents: agentsData?.length || 0,
        lenders: lendersData?.length || 0,
        leads: leadsData?.length || 0,
        errors: { contactsError, agentsError, lendersError, leadsError }
      });
      
      // 5. For email-imported contacts, fetch associated lead names via email_logs
      const emailImportContacts = (contactsData || []).filter(c => c.source_type === 'email_import' && c.email_log_id);
      const emailLogIds = emailImportContacts.map(c => c.email_log_id).filter(Boolean);
      
      let emailLogToLeadName: Record<string, string> = {};
      
      if (emailLogIds.length > 0) {
        // Fetch email_logs to get lead_id
        const { data: emailLogs } = await supabase
          .from('email_logs')
          .select('id, lead_id')
          .in('id', emailLogIds);
        
        if (emailLogs && emailLogs.length > 0) {
          const leadIds = emailLogs.map(el => el.lead_id).filter(Boolean);
          
          if (leadIds.length > 0) {
            // Fetch lead names
            const { data: leads } = await supabase
              .from('leads')
              .select('id, first_name, last_name')
              .in('id', leadIds);
            
            if (leads) {
              const leadIdToName: Record<string, string> = {};
              leads.forEach(l => {
                leadIdToName[l.id] = `${l.first_name} ${l.last_name}`.trim();
              });
              
              // Map email_log_id -> lead name
              emailLogs.forEach(el => {
                if (el.lead_id && leadIdToName[el.lead_id]) {
                  emailLogToLeadName[el.id] = leadIdToName[el.lead_id];
                }
              });
            }
          }
        }
      }
      
      // Transform all to unified format
      const unifiedContacts = [
        // Contacts (include source_type, description, email_log_id, associated_lead_name, job_title, approval_status, created_at)
        ...(contactsData || []).map(c => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          type: c.type,
          tags: c.tags || [],
          notes: c.notes,
          lead_created_date: c.lead_created_date,
          created_at: c.created_at,
          source: 'contacts' as const,
          source_id: c.id,
          source_type: c.source_type,
          description: c.description,
          email_log_id: c.email_log_id,
          associated_lead_name: c.email_log_id ? emailLogToLeadName[c.email_log_id] || null : null,
          job_title: c.job_title,
          approval_status: c.approval_status
        })),
        
        // Buyer Agents
        ...(agentsData || []).map(a => ({
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          phone: a.phone,
          company: a.brokerage,
          type: 'Agent',
          tags: [] as string[],
          notes: '',
          lead_created_date: a.created_at,
          created_at: a.created_at,
          source: 'buyer_agents' as const,
          source_id: a.id
        })),
        
        // Lenders (split account_executive name)
        ...(lendersData || []).map(l => {
          const nameParts = (l.account_executive || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          return {
            id: l.id,
            first_name: firstName,
            last_name: lastName,
            email: l.account_executive_email,
            phone: l.account_executive_phone,
            company: l.lender_name,
            type: 'Lender',
            tags: [l.lender_type].filter(Boolean),
            notes: l.notes || '',
            lead_created_date: l.created_at,
            created_at: l.created_at,
            source: 'lenders' as const,
            source_id: l.id
          };
        }),
        
        // Leads (as Borrowers)
        ...(leadsData || []).map(lead => ({
          id: lead.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          company: null,
          type: 'Borrower',
          tags: [] as string[],
          notes: '',
          lead_created_date: lead.lead_on_date,
          created_at: lead.lead_on_date,
          source: 'leads' as const,
          source_id: lead.id,
          pipeline_stage_id: lead.pipeline_stage_id
        }))
      ];
      
      return unifiedContacts;
    } catch (error) {
      console.error('Error fetching unified contacts:', error);
      throw error;
    }
  },

  // Ensure a buyer_agents record exists for a contact (for listing_agent_id compatibility)
  async ensureBuyerAgentFromContact(contactId: string) {
    // First get the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company, email')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contact) throw contactError || new Error('Contact not found');

    // Try to find existing buyer_agents record by email or name match
    let buyerAgent = null;
    if (contact.email) {
      const { data } = await supabase
        .from('buyer_agents')
        .select('*')
        .eq('email', contact.email)
        .maybeSingle();
      buyerAgent = data;
    }

    if (!buyerAgent) {
      const { data } = await supabase
        .from('buyer_agents')
        .select('*')
        .eq('first_name', contact.first_name)
        .eq('last_name', contact.last_name)
        .maybeSingle();
      buyerAgent = data;
    }

    // If not found, create new buyer_agents record
    if (!buyerAgent) {
      const { data: newAgent, error: createError } = await supabase
        .from('buyer_agents')
        .insert({
          first_name: contact.first_name,
          last_name: contact.last_name,
          brokerage: contact.company,
          email: contact.email,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Failed to create buyer_agent from contact:', createError);
        throw createError;
      }
      buyerAgent = newAgent;
    }

    return buyerAgent.id;
  },

  async ensureContactFromBuyerAgent(buyerAgentId: string) {
    const { data: agent, error: agentErr } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, brokerage, email')
      .eq('id', buyerAgentId)
      .single();
    if (agentErr || !agent) throw agentErr || new Error('Buyer agent not found');

    // 1) Try by email
    if (agent.email) {
      const { data: byEmail, error: byEmailErr } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', agent.email)
        .maybeSingle();
      if (byEmailErr) throw byEmailErr;
      if (byEmail?.id) return byEmail.id;
    }

    // 2) Try by name
    const { data: byName, error: byNameErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('first_name', agent.first_name)
      .eq('last_name', agent.last_name)
      .maybeSingle();
    if (byNameErr) throw byNameErr;
    if (byName?.id) return byName.id;

    // 3) Try by brokerage/company
    const { data: byBrokerage, error: byBrokerageErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('company', agent.brokerage)
      .maybeSingle();
    if (byBrokerageErr) throw byBrokerageErr;
    if (byBrokerage?.id) return byBrokerage.id;

    // Not found
    throw new Error(`No existing Contact found for agent "${agent.first_name} ${agent.last_name}". Please add them as a Contact, then retry.`);
  },

  async ensureContactForLender(lenderId: string) {
    const { data: lender, error: lenderErr } = await supabase
      .from('lenders')
      .select('id, lender_name, account_executive_email, account_executive_phone')
      .eq('id', lenderId)
      .single();
    if (lenderErr || !lender) throw lenderErr || new Error('Lender not found');

    // 1) Try by AE email
    if (lender.account_executive_email) {
      const { data: byEmail, error: byEmailErr } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', lender.account_executive_email)
        .maybeSingle();
      if (byEmailErr) throw byEmailErr;
      if (byEmail?.id) return byEmail.id;
    }

    // 2) Try by tags+company
    const { data: byTag, error: byTagErr } = await supabase
      .from('contacts')
      .select('id')
      .contains('tags', ['Lender'])
      .eq('company', lender.lender_name)
      .maybeSingle();
    if (byTagErr) throw byTagErr;
    if (byTag?.id) return byTag.id;

    // 3) Fallback by company only
    const { data: byCompany, error: byCompanyErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('company', lender.lender_name)
      .maybeSingle();
    if (byCompanyErr) throw byCompanyErr;
    if (byCompany?.id) return byCompany.id;

    // Not found - ask user to add it (RLS prevents auto-insert here)
    throw new Error(`No existing Contact found for lender "${lender.lender_name}". Please add the lender/A.E. as a Contact, then retry.`);
  },

  async getLeadByIdWithEmbeds(id: string) {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        pipeline_stage:pipeline_stages(*),
        lender:contacts!fk_leads_lender(id, first_name, last_name, company, email),
        approved_lender:lenders!fk_leads_approved_lender(id, lender_name, lender_type),
        buyer_agent:buyer_agents!leads_buyer_agent_id_fkey(id, first_name, last_name, brokerage, email, phone),
        listing_agent:buyer_agents!fk_leads_listing_agent(id, first_name, last_name, brokerage, email),
        teammate:users!fk_leads_teammate_assigned(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();
    if (error) {
      console.error('Failed to fetch lead with embeds:', error);
      throw error;
    }
    
    // Transform array embeds to single objects (Supabase returns arrays for FKs)
    return {
      ...data,
      pipeline_stage: Array.isArray((data as any).pipeline_stage) ? (data as any).pipeline_stage[0] || null : (data as any).pipeline_stage,
      lender: Array.isArray(data.lender) ? data.lender[0] || null : data.lender,
      approved_lender: Array.isArray(data.approved_lender) ? data.approved_lender[0] || null : data.approved_lender,
      buyer_agent: Array.isArray(data.buyer_agent) ? data.buyer_agent[0] || null : data.buyer_agent,
      listing_agent: Array.isArray(data.listing_agent) ? data.listing_agent[0] || null : data.listing_agent,
      teammate: Array.isArray(data.teammate) ? data.teammate[0] || null : data.teammate,
    };
  },


  async createLender(lender: any) {
    const { data, error } = await supabase
      .from('lenders')
      .insert(lender)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateLender(id: string, updates: any) {
    const { data, error } = await supabase
      .from('lenders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async getAgents() {
    // Use paginated getBuyerAgents to ensure all agents are loaded
    return this.getBuyerAgents();
  },

  async getRealEstateAgents() {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company, email, phone')
      .in('type', ['Real Estate Agent', 'Agent', 'Realtor'])
      .order('first_name');

    if (error) throw error;
    return data?.map(agent => ({
      ...agent,
      brokerage: agent.company
    })) || [];
  },

  // Condo operations
  async getCondos() {
    const PAGE_SIZE = 1000;
    let allCondos: any[] = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('condos')
        .select('*')
        .order('condo_name')
        .range(offset, offset + PAGE_SIZE - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allCondos = [...allCondos, ...data];
        offset += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
    
    return allCondos;
  },

  async createCondo(condo: any) {
    const { data, error } = await supabase
      .from('condos')
      .insert([condo])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateCondo(id: string, updates: any) {
    const { data, error } = await supabase
      .from('condos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Document operations
  async getLeadDocuments(leadId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async uploadLeadDocument(
    leadId: string,
    file: File,
    metadata?: { title?: string; notes?: string; source?: string }
  ) {
    // 1. Upload to storage
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `leads/${leadId}/${timestamp}_${sanitizedFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // 2. Create database record
    const { data: userData } = await supabase.auth.getUser();
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        lead_id: leadId,
        file_name: file.name,
        file_url: storagePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        uploaded_by: userData.user?.id,
        title: metadata?.title || file.name,
        notes: metadata?.notes,
        source: metadata?.source || 'manual'
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
    return data;
  },

  async updateLeadDocument(
    documentId: string,
    updates: { title?: string; notes?: string }
  ) {
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteLeadDocument(documentId: string, storagePath: string) {
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([storagePath]);
    
    if (storageError) console.error('Storage deletion error:', storageError);
    
    // 2. Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (dbError) throw dbError;
  },

  async createDocumentFromStoragePath(
    leadId: string,
    storagePath: string,
    metadata: { title: string; mime_type: string; size_bytes: number }
  ) {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        lead_id: leadId,
        file_name: metadata.title,
        file_url: storagePath,
        mime_type: metadata.mime_type,
        size_bytes: metadata.size_bytes,
        uploaded_by: userData.user?.id,
        title: metadata.title
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getDocumentSignedUrl(storagePathOrUrl: string, expiresIn = 3600) {
    // Handle legacy data where full signed URLs were stored instead of paths
    let storagePath = storagePathOrUrl;
    let detectedBucket: string | null = null;
    
    if (storagePathOrUrl.startsWith('https://') && storagePathOrUrl.includes('/storage/v1/')) {
      // Check if it's a public URL - if so, just return it directly
      if (storagePathOrUrl.includes('/storage/v1/object/public/')) {
        // Public bucket URL - can be used directly
        return storagePathOrUrl;
      }
      
      // Extract the storage path from signed URL
      // URL format: https://xxx.supabase.co/storage/v1/object/sign/bucket-name/path?token=xxx
      try {
        const url = new URL(storagePathOrUrl);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
        if (pathMatch) {
          detectedBucket = pathMatch[1];
          storagePath = decodeURIComponent(pathMatch[2]);
          console.log('[getDocumentSignedUrl] Extracted path from legacy URL:', storagePath, 'bucket:', detectedBucket);
        }
      } catch (e) {
        console.error('[getDocumentSignedUrl] Failed to parse legacy URL:', e);
        // Fall through and try using original value
      }
    }
    
    // Handle different storage paths - try detected bucket first, then lead-documents, then documents
    const buckets = detectedBucket 
      ? [detectedBucket, 'lead-documents', 'documents']
      : ['lead-documents', 'documents'];
    
    for (const bucket of buckets) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, expiresIn);
        
        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (e) {
        // Continue to next bucket
      }
    }
    
    // Final attempt with documents bucket
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  },

  // Pipeline Views
  async getPipelineViews(pipelineType: string) {
    const { data, error } = await supabase
      .from('pipeline_views')
      .select('*')
      .eq('pipeline_type', pipelineType)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createPipelineView(view: {
    name: string;
    pipeline_type: string;
    column_order: string[];
    column_widths?: Record<string, number>;
    is_default?: boolean;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // If setting as default, first clear other defaults for same pipeline_type
    if (view.is_default) {
      await supabase
        .from('pipeline_views')
        .update({ is_default: false })
        .eq('pipeline_type', view.pipeline_type);
    }
    
    const { data, error } = await supabase
      .from('pipeline_views')
      .insert({
        ...view,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePipelineView(id: string, updates: {
    name?: string;
    column_order?: string[];
    column_widths?: Record<string, number>;
    is_default?: boolean;
  }) {
    // If setting as default, first clear other defaults for same pipeline_type
    if (updates.is_default) {
      const { data: currentView } = await supabase
        .from('pipeline_views')
        .select('pipeline_type')
        .eq('id', id)
        .single();
      
      if (currentView) {
        await supabase
          .from('pipeline_views')
          .update({ is_default: false })
          .eq('pipeline_type', currentView.pipeline_type)
          .neq('id', id);
      }
    }
    
    const { data, error } = await supabase
      .from('pipeline_views')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletePipelineView(id: string) {
    const { error } = await supabase
      .from('pipeline_views')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};