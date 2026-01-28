import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Users - cached for 10 minutes
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Lenders - cached for 10 minutes  
export function useLenders() {
  return useQuery({
    queryKey: ['lenders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lenders')
        .select('*')
        .order('lender_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Agents - cached for 10 minutes
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('*')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Pipeline Stages - cached for 30 minutes (rarely changes)
export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Sidebar notification counts - cached for 1 minute with background refresh
export function useSidebarCounts() {
  return useQuery({
    queryKey: ['sidebar-counts'],
    queryFn: async () => {
      const [suggestions, queue, feedback, contacts, lenderSuggestions] = await Promise.allSettled([
        supabase.from('email_field_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('email_automation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('team_feedback').select('*', { count: 'exact', head: true }).eq('is_read_by_admin', false),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('lender_field_suggestions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        pendingSuggestions: suggestions.status === 'fulfilled' ? suggestions.value.count || 0 : 0,
        pendingEmailQueue: queue.status === 'fulfilled' ? queue.value.count || 0 : 0,
        newFeedback: feedback.status === 'fulfilled' ? feedback.value.count || 0 : 0,
        pendingContacts: contacts.status === 'fulfilled' ? contacts.value.count || 0 : 0,
        pendingLenderSuggestions: lenderSuggestions.status === 'fulfilled' ? lenderSuggestions.value.count || 0 : 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute in background
  });
}

// Home page counts - cached for 2 minutes
export function useHomeCounts() {
  return useQuery({
    queryKey: ['home-counts'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthISO = startOfMonth.toISOString();
      const startOfMonthDate = startOfMonthISO.split('T')[0];

      const [leads, apps, closed, active, agents, unread, added, removed] = await Promise.allSettled([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('is_closed', false).gte('lead_on_date', startOfMonthDate),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('pipeline_stage_id', '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945').gte('pending_app_at', startOfMonthISO),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('pipeline_stage_id', 'e9fc7eb8-6519-4768-b49e-3ebdd3738ac0').gte('close_date', startOfMonthDate),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('pipeline_stage_id', '76eb2e82-e1d9-4f2d-a57d-2120a25696db'),
        supabase.from('buyer_agents').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('direction', 'In').is('opened_at', null),
        supabase.from('buyer_agents').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonthISO),
        supabase.from('buyer_agents').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null).gte('deleted_at', startOfMonthISO),
      ]);

      return {
        leadsThisMonth: leads.status === 'fulfilled' ? leads.value.count || 0 : 0,
        applicationsThisMonth: apps.status === 'fulfilled' ? apps.value.count || 0 : 0,
        closedThisMonth: closed.status === 'fulfilled' ? closed.value.count || 0 : 0,
        activeCount: active.status === 'fulfilled' ? active.value.count || 0 : 0,
        agentCount: agents.status === 'fulfilled' ? agents.value.count || 0 : 0,
        unreadEmailCount: unread.status === 'fulfilled' ? unread.value.count || 0 : 0,
        agentsAddedThisMonth: added.status === 'fulfilled' ? added.value.count || 0 : 0,
        agentsRemovedThisMonth: removed.status === 'fulfilled' ? removed.value.count || 0 : 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
