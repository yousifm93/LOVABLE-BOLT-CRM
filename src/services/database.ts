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
      .select(`
        *,
        pipeline_stage:pipeline_stages(*),
        teammate:users(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteLead: async (id: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
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
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        buyer_agent:buyer_agents(*),
        lender:contacts!lender_id(*),
        listing_agent:buyer_agents!listing_agent_id(*),
        teammate:users!teammate_assigned(*)
      `)
      .not('loan_status', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getLenders() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('type', 'Other')
      .order('first_name');

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
  }
};