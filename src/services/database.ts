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

export type TeamAssignment = Database['public']['Tables']['team_assignments']['Row'];
export type TeamAssignmentInsert = Database['public']['Tables']['team_assignments']['Insert'];

export type LeadExternalContact = Database['public']['Tables']['lead_external_contacts']['Row'];
export type LeadExternalContactInsert = Database['public']['Tables']['lead_external_contacts']['Insert'];

export type LeadDate = Database['public']['Tables']['lead_dates']['Row'];
export type LeadDateInsert = Database['public']['Tables']['lead_dates']['Insert'];

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
  
  if (lead.estimated_fico && (lead.estimated_fico < 300 || lead.estimated_fico > 850)) {
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

// Database service functions
export const databaseService = {
  // Lead operations
  async getLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users!teammate_assigned(*),
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

  async getLeadsWithTaskDueDates() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users!teammate_assigned(*),
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

      // Build insert payload explicitly
      const leadPayload: any = {
        ...lead,
        created_by: userId,
        account_id: accountId,
        teammate_assigned: (lead as any).teammate_assigned ?? teammateId ?? null,
        pipeline_stage_id: null, // NULL for "New" page filter
        pipeline_section: null, // Don't put in Active section
        lead_on_date:
          inputLeadOnDate instanceof Date
            ? formatLocalDate(inputLeadOnDate)
            : (lead as any).lead_on_date || formatLocalDate(new Date()),
        task_eta: formatLocalDate(new Date()),
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
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteLead: async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('[DEBUG] Delete lead:', {
        leadId: id,
        userId: user.id
      });

      // Delete the lead (RLS handles access control)
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[DEBUG] Delete lead error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('[DEBUG] Lead deleted successfully');
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
        *,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(id, first_name, last_name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getDeletedTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(id, first_name, last_name),
        deleted_by_user:users!tasks_deleted_by_fkey(id, first_name, last_name, email)
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createTask(task: TaskInsert) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(*),
        created_by_user:users!tasks_created_by_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(*)
      `)
      .single();
    
    if (error) {
      console.error('Task creation error:', error);
      throw error;
    }
    return data;
  },

  async updateTask(id: string, updates: TaskUpdate) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(id, first_name, last_name)
      `)
      .single();
    
    if (error) throw error;
    return data;
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
    const [notes, callLogs, smsLogs, emailLogs] = await Promise.all([
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
          user:users(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
    ]);

    const activities = [
      ...(notes.data || []).map(note => ({ ...note, type: 'note' as const })),
      ...(callLogs.data || []).map(log => ({ ...log, type: 'call' as const })),
      ...(smsLogs.data || []).map(log => ({ ...log, type: 'sms' as const })),
      ...(emailLogs.data || []).map(log => ({ ...log, type: 'email' as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return activities;
  },

  // Buyer Agent operations
  async getBuyerAgents() {
    const { data, error } = await supabase
      .from('buyer_agents')
      .select('*')
      .order('first_name');
    
    if (error) throw error;
    return data;
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

  // Team assignment operations
  async getTeamAssignments(leadId: string) {
    const { data, error } = await supabase
      .from('team_assignments')
      .select(`
        *,
        user:users(id, first_name, last_name, email)
      `)
      .eq('lead_id', leadId);
    
    if (error) throw error;
    return data;
  },

  async assignTeamMember(assignment: TeamAssignmentInsert) {
    const { data, error } = await supabase
      .from('team_assignments')
      .upsert(assignment, { onConflict: 'lead_id,role' })
      .select(`
        *,
        user:users(id, first_name, last_name, email)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async removeTeamMember(leadId: string, role: string) {
    const { error } = await supabase
      .from('team_assignments')
      .delete()
      .eq('lead_id', leadId)
      .eq('role', role);
    
    if (error) throw error;
  },

  // External contact operations
  async getLeadExternalContacts(leadId: string) {
    const { data, error } = await supabase
      .from('lead_external_contacts')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone, company, type)
      `)
      .eq('lead_id', leadId);
    
    if (error) throw error;
    return data;
  },

  async linkExternalContact(contact: LeadExternalContactInsert) {
    const { data, error } = await supabase
      .from('lead_external_contacts')
      .upsert(contact, { onConflict: 'lead_id,type' })
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone, company, type)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async unlinkExternalContact(leadId: string, type: string) {
    const { error } = await supabase
      .from('lead_external_contacts')
      .delete()
      .eq('lead_id', leadId)
      .eq('type', type);
    
    if (error) throw error;
  },

  // Lead dates operations
  async getLeadDates(leadId: string) {
    const { data, error } = await supabase
      .from('lead_dates')
      .select('*')
      .eq('lead_id', leadId);
    
    if (error) throw error;
    return data;
  },

  async setLeadDate(leadId: string, key: string, date: Date | null) {
    if (date === null) {
      const { error } = await supabase
        .from('lead_dates')
        .delete()
        .eq('lead_id', leadId)
        .eq('key', key);
      
      if (error) throw error;
      return null;
    }

    const { data, error } = await supabase
      .from('lead_dates')
      .upsert({
        lead_id: leadId,
        key,
        value_date: date.toISOString().split('T')[0]
      }, { onConflict: 'lead_id,key' })
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Embed error, using fallback query:', error);
        // Fallback: query without embeds
        const fallbackResult = await supabase
          .from('leads')
          .select('*')
          .in('pipeline_section', ['Incoming', 'Live', 'On Hold'])
          .order('created_at', { ascending: false });
        
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
    const { data, error } = await supabase
      .from('buyer_agents')
      .select('*')
      .order('first_name');

    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('condos')
      .select('*')
      .order('condo_name');
    
    if (error) throw error;
    return data;
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
    metadata?: { title?: string; notes?: string }
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
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: userData.user?.id,
        title: metadata?.title || file.name,
        notes: metadata?.notes
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
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

  async getDocumentSignedUrl(storagePath: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  }
};