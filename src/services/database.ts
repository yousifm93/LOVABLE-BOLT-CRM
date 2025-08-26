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
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          pipeline_stage:pipeline_stages(*),
          teammate:users(*)
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
        pipeline_stage: lead.pipeline_stage || null
      })) || [];
    } catch (error) {
      console.error('Failed to load leads:', error);
      throw new Error('Failed to load leads. Please try again.');
    }
  },

  async createLead(lead: LeadInsert) {
    // Ensure required fields are set and handle empty strings
    const leadData = {
      ...lead,
      // Convert empty strings to null for optional enum fields
      source: lead.source || null,
      referred_via: lead.referred_via || null,
    };
    
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select(`
        *,
        pipeline_stage:pipeline_stages(*),
        teammate:users(*)
      `)
      .single();
    
    if (error) {
      console.error('Lead creation error:', error);
      throw error;
    }
    return data;
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

  // Task operations
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(*),
        created_by_user:users!tasks_created_by_fkey(*),
        related_lead:leads!tasks_related_lead_id_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(*)
      `)
      .order('task_order', { ascending: true });
    
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
        related_lead:leads!tasks_related_lead_id_fkey(*),
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
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(*),
        created_by_user:users!tasks_created_by_fkey(*),
        related_lead:leads!tasks_related_lead_id_fkey(*),
        borrower:leads!tasks_borrower_id_fkey(*)
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
  }
};