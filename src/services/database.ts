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
      // Get current user's session and profile
      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      if (authError || !sessionData?.session?.user) {
        throw new Error('No authenticated session found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', sessionData.session.user.id)
        .single();
      
      if (profileError) {
        throw new Error(`Failed to get user profile: ${profileError.message}`);
      }

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users(*)
        `)
        .eq('account_id', profile.account_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }
      
      // Handle null relations to prevent transformation errors
      return data?.map(lead => ({
        ...lead,
        teammate: lead.teammate || null,
        pipeline_stage: lead.pipeline_stage || null
      })) || [];
    } catch (error) {
      console.error('Failed to load leads:', error);
      throw new Error('Failed to load leads. Please try again.');
    }
  },

  async getLeadsWithTaskDueDates() {
    try {
      // Get current user's session and profile
      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      if (authError || !sessionData?.session?.user) {
        throw new Error('No authenticated session found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', sessionData.session.user.id)
        .single();
      
      if (profileError) {
        throw new Error(`Failed to get user profile: ${profileError.message}`);
      }

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users(*),
          tasks(due_date)
        `)
        .eq('account_id', profile.account_id)
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
      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('[DEBUG] Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!sessionData?.session?.user) {
        console.error('[DEBUG] No authenticated user found');
        throw new Error('No authenticated session found');
      }

      console.log('[DEBUG] Authenticated user:', sessionData.session.user.id);

      // Get user's profile to get account_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', sessionData.session.user.id)
        .single();
      
      if (profileError) {
        console.error('[DEBUG] Profile error:', profileError);
        throw new Error(`Failed to get user profile: ${profileError.message}`);
      }

      if (!profile?.account_id) {
        console.error('[DEBUG] No account_id found in profile:', profile);
        throw new Error('User profile missing account_id');
      }

      console.log('[DEBUG] User account_id:', profile.account_id);

      // Prepare lead data with account info
      const leadDataWithAuth = {
        ...lead,
        // Convert empty strings to null for optional enum fields
        source: lead.source || null,
        referred_via: lead.referred_via || null,
        created_by: sessionData.session.user.id,
        account_id: profile.account_id,
      };

      console.log('[DEBUG] Lead data with auth:', leadDataWithAuth);

      // Insert the lead
      const { data, error } = await supabase
        .from('leads')
        .insert(leadDataWithAuth)
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users(*)
        `)
        .single();
      
      if (error) {
        console.error('[DEBUG] Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('[DEBUG] Lead created successfully:', data);
      return data;
    } catch (error: any) {
      console.error('[DEBUG] CreateLead function error:', error);
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
      // Get the user's account_id from their profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      console.log('[DEBUG] Delete lead:', {
        leadId: id,
        userId: user.id,
        accountId: profile.account_id
      });

      // Delete the lead with explicit account_id check
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('account_id', profile.account_id);

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
      // Get current user's session and profile
      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      if (authError || !sessionData?.session?.user) {
        throw new Error('No authenticated session found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', sessionData.session.user.id)
        .single();
      
      if (profileError) {
        throw new Error(`Failed to get user profile: ${profileError.message}`);
      }

      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          buyer_agent:buyer_agents(*),
          lender:contacts!lender_id(*),
          listing_agent:buyer_agents!listing_agent_id(*),
          teammate:users!teammate_assigned(*)
        `)
        .eq('account_id', profile.account_id)
        .eq('pipeline_stage_id', '76eb2e82-e1d9-4f2d-a57d-2120a25696db')
        .in('pipeline_section', ['Incoming', 'Live', 'On Hold'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Handle null relations to prevent errors
      return data?.map(loan => ({
        ...loan,
        buyer_agent: loan.buyer_agent || null,
        lender: loan.lender || null,
        listing_agent: loan.listing_agent || null,
        teammate: loan.teammate || null
      })) || [];
    } catch (error) {
      console.error('Failed to load active loans:', error);
      throw new Error('Failed to load active loans. Please try again.');
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
  }
};