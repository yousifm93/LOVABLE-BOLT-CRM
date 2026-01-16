import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_on_date: string;
  app_complete_at: string | null;
  pipeline_stage_id?: string;
  notes?: string | null;
}

export interface DashboardFaceToFaceMeeting {
  id: string;
  first_name: string;
  last_name: string;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
  face_to_face_meeting: string;
  notes?: string | null;
  meeting_summary?: string | null;
}

export interface DashboardCall {
  id: string;
  name: string;
  person_type: 'Lead' | 'Agent';
  call_date: string;
  call_type?: string | null;
  notes: string | null;
  lead_id?: string | null;
  logged_by_name?: string | null;
}

export interface DashboardEmail {
  id: string;
  lead_id: string;
  direction: 'In' | 'Out';
  from_email: string;
  to_email: string;
  subject: string;
  snippet: string | null;
  timestamp: string;
  delivery_status: string | null;
  ai_summary: string | null;
  lead?: {
    first_name: string;
    last_name: string;
  };
}

export const useDashboardData = () => {
  // Get current date in local timezone
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // For DATE comparisons (lead_on_date), use date-only strings
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // For TIMESTAMPTZ comparisons, use UTC boundaries that align with local dates
  const getUTCDayBoundaries = (date: Date) => {
    // Create a new date at midnight local time
    const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const localEndOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    // Get the UTC timestamps for these local times
    return {
      start: localMidnight.toISOString(),
      end: localEndOfDay.toISOString()
    };
  };

  // Get week range (Monday-Sunday)
  const getWeekRange = (weekOffset: number = 0) => {
    const now = new Date();
    const day = now.getDay();
    // Monday of current week (day 0 = Sunday, so adjust)
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: monday.toISOString(),
      end: sunday.toISOString()
    };
  };

  const thisWeekRange = getWeekRange(0);
  const lastWeekRange = getWeekRange(-1);

  const todayBoundaries = getUTCDayBoundaries(today);
  const yesterdayBoundaries = getUTCDayBoundaries(yesterday);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  // This Month's Leads
  const { data: thisMonthLeads, isLoading: isLoadingThisMonthLeads } = useQuery({
    queryKey: ['leads', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
        .eq('is_closed', false)
        .gte('lead_on_date', formatDate(startOfMonth))
        .lt('lead_on_date', formatDate(startOfNextMonth))
        .order('lead_on_date', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Yesterday's Leads
  const { data: yesterdayLeads, isLoading: isLoadingYesterdayLeads } = useQuery({
    queryKey: ['leads', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
        .eq('is_closed', false)
        .eq('lead_on_date', formatDate(yesterday))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Today's Leads
  const { data: todayLeads, isLoading: isLoadingTodayLeads } = useQuery({
    queryKey: ['leads', 'today', formatDate(today)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
        .eq('is_closed', false)
        .eq('lead_on_date', formatDate(today))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Last Week's Leads
  const { data: lastWeekLeads, isLoading: isLoadingLastWeekLeads } = useQuery({
    queryKey: ['leads', 'lastWeek', lastWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
        .eq('is_closed', false)
        .gte('lead_on_date', lastWeekRange.start.split('T')[0])
        .lte('lead_on_date', lastWeekRange.end.split('T')[0])
        .order('lead_on_date', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // This Week's Leads
  const { data: thisWeekLeadsData, isLoading: isLoadingThisWeekLeadsData } = useQuery({
    queryKey: ['leads', 'thisWeek', thisWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
        .eq('is_closed', false)
        .gte('lead_on_date', thisWeekRange.start.split('T')[0])
        .lte('lead_on_date', thisWeekRange.end.split('T')[0])
        .order('lead_on_date', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // All Leads
  const { data: allLeads, isLoading: isLoadingAllLeads } = useQuery({
    queryKey: ['leads', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id, notes')
        .eq('is_closed', false)
        .order('lead_on_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // This Month's Apps
  const { data: thisMonthApps, isLoading: isLoadingThisMonthApps } = useQuery({
    queryKey: ['applications', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const startOfMonthTimestamp = startOfMonth.toISOString();
      const startOfNextMonthTimestamp = startOfNextMonth.toISOString();
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .eq('is_closed', false)
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', startOfMonthTimestamp)
        .lt('app_complete_at', startOfNextMonthTimestamp)
        .order('app_complete_at', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Yesterday's Apps
  const { data: yesterdayApps, isLoading: isLoadingYesterdayApps } = useQuery({
    queryKey: ['applications', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .eq('is_closed', false)
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', yesterdayBoundaries.start)
        .lte('app_complete_at', yesterdayBoundaries.end)
        .order('app_complete_at', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Today's Apps
  const { data: todayApps, isLoading: isLoadingTodayApps } = useQuery({
    queryKey: ['applications', 'today', formatDate(today)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .eq('is_closed', false)
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', todayBoundaries.start)
        .lte('app_complete_at', todayBoundaries.end)
        .order('app_complete_at', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Last Week's Apps
  const { data: lastWeekApps, isLoading: isLoadingLastWeekApps } = useQuery({
    queryKey: ['applications', 'lastWeek', lastWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .eq('is_closed', false)
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', lastWeekRange.start)
        .lte('app_complete_at', lastWeekRange.end)
        .order('app_complete_at', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // This Week's Apps
  const { data: thisWeekApps, isLoading: isLoadingThisWeekApps } = useQuery({
    queryKey: ['applications', 'thisWeek', thisWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .eq('is_closed', false)
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', thisWeekRange.start)
        .lte('app_complete_at', thisWeekRange.end)
        .order('app_complete_at', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // All Applications
  const { data: allApplications, isLoading: isLoadingAllApps } = useQuery({
    queryKey: ['applications', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .eq('is_closed', false)
        .not('app_complete_at', 'is', null)
        .order('app_complete_at', { ascending: true });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // This Month's Face-to-Face Meetings
  const { data: thisMonthMeetings, isLoading: isLoadingThisMonthMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const startOfMonthTimestamp = startOfMonth.toISOString();
      const startOfNextMonthTimestamp = startOfNextMonth.toISOString();
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select(`
          id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes,
          agent_call_logs!agent_call_logs_agent_id_fkey(*)
        `)
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', startOfMonthTimestamp)
        .lt('face_to_face_meeting', startOfNextMonthTimestamp)
        .order('face_to_face_meeting', { ascending: true });
      
      if (error) throw error;
      
      // Transform to include meeting_summary from the most recent meeting log
      return data.map(agent => ({
        ...agent,
        meeting_summary: Array.isArray(agent.agent_call_logs) 
          ? agent.agent_call_logs.find((log: any) => log.log_type === 'meeting')?.summary || null
          : null
      })) as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // Last Week's Face-to-Face Meetings
  const { data: lastWeekMeetings, isLoading: isLoadingLastWeekMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'lastWeek', lastWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select(`
          id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes,
          agent_call_logs!agent_call_logs_agent_id_fkey(*)
        `)
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', lastWeekRange.start)
        .lte('face_to_face_meeting', lastWeekRange.end)
        .order('face_to_face_meeting', { ascending: true });
      
      if (error) throw error;
      
      // Transform to include meeting_summary from the most recent meeting log
      return data.map(agent => ({
        ...agent,
        meeting_summary: Array.isArray(agent.agent_call_logs) 
          ? agent.agent_call_logs.find((log: any) => log.log_type === 'meeting')?.summary || null
          : null
      })) as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // This Week's Face-to-Face Meetings
  const { data: thisWeekMeetings, isLoading: isLoadingThisWeekMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'thisWeek', thisWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select(`
          id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes,
          agent_call_logs!agent_call_logs_agent_id_fkey(*)
        `)
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', thisWeekRange.start)
        .lte('face_to_face_meeting', thisWeekRange.end)
        .order('face_to_face_meeting', { ascending: true });
      
      if (error) throw error;
      
      // Transform to include meeting_summary from the most recent meeting log
      return data.map(agent => ({
        ...agent,
        meeting_summary: Array.isArray(agent.agent_call_logs) 
          ? agent.agent_call_logs.find((log: any) => log.log_type === 'meeting')?.summary || null
          : null
      })) as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // Yesterday's Face-to-Face Meetings
  const { data: yesterdayMeetings, isLoading: isLoadingYesterdayMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select(`
          id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes,
          agent_call_logs!agent_call_logs_agent_id_fkey(*)
        `)
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', yesterdayBoundaries.start)
        .lte('face_to_face_meeting', yesterdayBoundaries.end)
        .order('face_to_face_meeting', { ascending: true });
      
      if (error) throw error;
      
      return data.map(agent => ({
        ...agent,
        meeting_summary: Array.isArray(agent.agent_call_logs) 
          ? agent.agent_call_logs.find((log: any) => log.log_type === 'meeting')?.summary || null
          : null
      })) as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // Today's Face-to-Face Meetings
  const { data: todayMeetings, isLoading: isLoadingTodayMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'today', formatDate(today)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select(`
          id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes,
          agent_call_logs!agent_call_logs_agent_id_fkey(*)
        `)
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', todayBoundaries.start)
        .lte('face_to_face_meeting', todayBoundaries.end)
        .order('face_to_face_meeting', { ascending: true });
      
      if (error) throw error;
      
      return data.map(agent => ({
        ...agent,
        meeting_summary: Array.isArray(agent.agent_call_logs) 
          ? agent.agent_call_logs.find((log: any) => log.log_type === 'meeting')?.summary || null
          : null
      })) as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // All Face-to-Face Meetings
  const { data: allMeetings, isLoading: isLoadingAllMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select(`
          id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes,
          agent_call_logs!agent_call_logs_agent_id_fkey(*)
        `)
        .not('face_to_face_meeting', 'is', null)
        .order('face_to_face_meeting', { ascending: true });
      
      if (error) throw error;
      
      // Transform to include meeting_summary from the most recent meeting log
      return data.map(agent => ({
        ...agent,
        meeting_summary: Array.isArray(agent.agent_call_logs) 
          ? agent.agent_call_logs.find((log: any) => log.log_type === 'meeting')?.summary || null
          : null
      })) as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // ============== BROKER OPENS ==============
  
  // This Month's Broker Opens
  const { data: thisMonthBrokerOpens, isLoading: isLoadingThisMonthBrokerOpens } = useQuery({
    queryKey: ['brokerOpens', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const startOfMonthTimestamp = startOfMonth.toISOString();
      const startOfNextMonthTimestamp = startOfNextMonth.toISOString();
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, broker_open, notes')
        .not('broker_open', 'is', null)
        .gte('broker_open', startOfMonthTimestamp)
        .lt('broker_open', startOfNextMonthTimestamp)
        .order('broker_open', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Last Week's Broker Opens
  const { data: lastWeekBrokerOpens, isLoading: isLoadingLastWeekBrokerOpens } = useQuery({
    queryKey: ['brokerOpens', 'lastWeek', lastWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, broker_open, notes')
        .not('broker_open', 'is', null)
        .gte('broker_open', lastWeekRange.start)
        .lte('broker_open', lastWeekRange.end)
        .order('broker_open', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // This Week's Broker Opens
  const { data: thisWeekBrokerOpens, isLoading: isLoadingThisWeekBrokerOpens } = useQuery({
    queryKey: ['brokerOpens', 'thisWeek', thisWeekRange.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, broker_open, notes')
        .not('broker_open', 'is', null)
        .gte('broker_open', thisWeekRange.start)
        .lte('broker_open', thisWeekRange.end)
        .order('broker_open', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Yesterday's Broker Opens
  const { data: yesterdayBrokerOpens, isLoading: isLoadingYesterdayBrokerOpens } = useQuery({
    queryKey: ['brokerOpens', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, broker_open, notes')
        .not('broker_open', 'is', null)
        .gte('broker_open', yesterdayBoundaries.start)
        .lte('broker_open', yesterdayBoundaries.end)
        .order('broker_open', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Today's Broker Opens
  const { data: todayBrokerOpens, isLoading: isLoadingTodayBrokerOpens } = useQuery({
    queryKey: ['brokerOpens', 'today', formatDate(today)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, broker_open, notes')
        .not('broker_open', 'is', null)
        .gte('broker_open', todayBoundaries.start)
        .lte('broker_open', todayBoundaries.end)
        .order('broker_open', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // All Broker Opens
  const { data: allBrokerOpens, isLoading: isLoadingAllBrokerOpens } = useQuery({
    queryKey: ['brokerOpens', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, broker_open, notes')
        .not('broker_open', 'is', null)
        .order('broker_open', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // ============== CALL TYPE BREAKDOWN ==============
  const PAST_CLIENTS_STAGE_ID = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd';

  // Helper function to fetch agent calls by call_type (oldest first for dashboard slot grids)
  const fetchAgentCallsByType = async (callType: string, startTime?: string, endTime?: string) => {
    let query = supabase
      .from('agent_call_logs')
      .select('id, logged_at, summary, call_type, agent_id, lead_id, buyer_agents!inner(first_name, last_name), logged_by_user:users!agent_call_logs_logged_by_fkey(first_name, last_name)')
      .eq('log_type', 'call')
      .eq('call_type', callType);
    
    if (startTime) query = query.gte('logged_at', startTime);
    if (endTime) query = query.lte('logged_at', endTime);
    
    // Order ascending (oldest first) so slot #1 = earliest date
    const { data, error } = await query.order('logged_at', { ascending: true });
    if (error) throw error;
    
    return (data || []).map(c => {
      const loggedByUser = c.logged_by_user as any;
      return {
        id: c.id,
        name: `${(c.buyer_agents as any)?.first_name || ''} ${(c.buyer_agents as any)?.last_name || ''}`.trim(),
        person_type: 'Agent' as const,
        call_date: c.logged_at,
        call_type: c.call_type,
        notes: c.summary,
        lead_id: c.lead_id || null,
        logged_by_name: loggedByUser ? `${loggedByUser.first_name || ''} ${loggedByUser.last_name || ''}`.trim() : null,
      };
    });
  };

  // New Agent Calls
  const { data: thisMonthNewAgentCalls, isLoading: isLoadingThisMonthNewAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'new_agent', 'thisMonth', formatDate(startOfMonth)],
    queryFn: () => fetchAgentCallsByType('new_agent', startOfMonth.toISOString(), startOfNextMonth.toISOString()),
    staleTime: 30000,
  });
  const { data: yesterdayNewAgentCalls, isLoading: isLoadingYesterdayNewAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'new_agent', 'yesterday', formatDate(yesterday)],
    queryFn: () => fetchAgentCallsByType('new_agent', yesterdayBoundaries.start, yesterdayBoundaries.end),
    staleTime: 30000,
  });
  const { data: todayNewAgentCalls, isLoading: isLoadingTodayNewAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'new_agent', 'today', formatDate(today)],
    queryFn: () => fetchAgentCallsByType('new_agent', todayBoundaries.start, todayBoundaries.end),
    staleTime: 30000,
  });

  // Current Agent Calls
  const { data: thisMonthCurrentAgentCalls, isLoading: isLoadingThisMonthCurrentAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'current_agent', 'thisMonth', formatDate(startOfMonth)],
    queryFn: () => fetchAgentCallsByType('current_agent', startOfMonth.toISOString(), startOfNextMonth.toISOString()),
    staleTime: 30000,
  });
  const { data: yesterdayCurrentAgentCalls, isLoading: isLoadingYesterdayCurrentAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'current_agent', 'yesterday', formatDate(yesterday)],
    queryFn: () => fetchAgentCallsByType('current_agent', yesterdayBoundaries.start, yesterdayBoundaries.end),
    staleTime: 30000,
  });
  const { data: todayCurrentAgentCalls, isLoading: isLoadingTodayCurrentAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'current_agent', 'today', formatDate(today)],
    queryFn: () => fetchAgentCallsByType('current_agent', todayBoundaries.start, todayBoundaries.end),
    staleTime: 30000,
  });

  // Top Agent Calls
  const { data: thisMonthTopAgentCalls, isLoading: isLoadingThisMonthTopAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'top_agent', 'thisMonth', formatDate(startOfMonth)],
    queryFn: () => fetchAgentCallsByType('top_agent', startOfMonth.toISOString(), startOfNextMonth.toISOString()),
    staleTime: 30000,
  });
  const { data: yesterdayTopAgentCalls, isLoading: isLoadingYesterdayTopAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'top_agent', 'yesterday', formatDate(yesterday)],
    queryFn: () => fetchAgentCallsByType('top_agent', yesterdayBoundaries.start, yesterdayBoundaries.end),
    staleTime: 30000,
  });
  const { data: todayTopAgentCalls, isLoading: isLoadingTodayTopAgentCalls } = useQuery({
    queryKey: ['agentCalls', 'top_agent', 'today', formatDate(today)],
    queryFn: () => fetchAgentCallsByType('top_agent', todayBoundaries.start, todayBoundaries.end),
    staleTime: 30000,
  });

  // Past LA Calls
  const { data: thisMonthPastLACalls, isLoading: isLoadingThisMonthPastLACalls } = useQuery({
    queryKey: ['agentCalls', 'past_la', 'thisMonth', formatDate(startOfMonth)],
    queryFn: () => fetchAgentCallsByType('past_la', startOfMonth.toISOString(), startOfNextMonth.toISOString()),
    staleTime: 30000,
  });
  const { data: yesterdayPastLACalls, isLoading: isLoadingYesterdayPastLACalls } = useQuery({
    queryKey: ['agentCalls', 'past_la', 'yesterday', formatDate(yesterday)],
    queryFn: () => fetchAgentCallsByType('past_la', yesterdayBoundaries.start, yesterdayBoundaries.end),
    staleTime: 30000,
  });
  const { data: todayPastLACalls, isLoading: isLoadingTodayPastLACalls } = useQuery({
    queryKey: ['agentCalls', 'past_la', 'today', formatDate(today)],
    queryFn: () => fetchAgentCallsByType('past_la', todayBoundaries.start, todayBoundaries.end),
    staleTime: 30000,
  });

  // Current Client Calls (from call_logs where lead is in current client stages - NOT Past Clients)
  const CURRENT_CLIENT_STAGE_IDS = [
    'c54f417b-3f67-43de-80f5-954cf260d571', // Leads
    '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945', // Pending App
    'a4e162e0-5421-4d17-8ad5-4b1195bbc995', // Screening
    '09162eec-d2b2-48e5-86d0-9e66ee8b2af7', // Pre-Qualified
    '3cbf38ff-752e-4163-a9a3-1757499b4945', // Pre-Approved
    '76eb2e82-e1d9-4f2d-a57d-2120a25696db', // Active
    '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a', // Idle
  ];

  const fetchCurrentClientCalls = async (startTime?: string, endTime?: string) => {
    let query = supabase
      .from('call_logs')
      .select('id, timestamp, notes, lead_id, user_id, leads!inner(first_name, last_name, pipeline_stage_id), logged_by_user:users!call_logs_user_id_fkey(first_name, last_name)')
      .in('leads.pipeline_stage_id', CURRENT_CLIENT_STAGE_IDS);
    
    if (startTime) query = query.gte('timestamp', startTime);
    if (endTime) query = query.lte('timestamp', endTime);
    
    // Order ascending (oldest first) so slot #1 = earliest date
    const { data, error } = await query.order('timestamp', { ascending: true });
    if (error) throw error;
    
    return (data || []).map(c => {
      const loggedByUser = c.logged_by_user as any;
      return {
        id: c.id,
        name: `${(c.leads as any)?.first_name || ''} ${(c.leads as any)?.last_name || ''}`.trim(),
        person_type: 'Lead' as const,
        call_date: c.timestamp,
        call_type: 'current_client',
        notes: c.notes,
        lead_id: c.lead_id,
        logged_by_name: loggedByUser ? `${loggedByUser.first_name || ''} ${loggedByUser.last_name || ''}`.trim() : null,
      };
    });
  };

  const { data: thisMonthCurrentClientCalls, isLoading: isLoadingThisMonthCurrentClientCalls } = useQuery({
    queryKey: ['currentClientCalls', 'thisMonth', formatDate(startOfMonth)],
    queryFn: () => fetchCurrentClientCalls(startOfMonth.toISOString(), startOfNextMonth.toISOString()),
    staleTime: 30000,
  });
  const { data: yesterdayCurrentClientCalls, isLoading: isLoadingYesterdayCurrentClientCalls } = useQuery({
    queryKey: ['currentClientCalls', 'yesterday', formatDate(yesterday)],
    queryFn: () => fetchCurrentClientCalls(yesterdayBoundaries.start, yesterdayBoundaries.end),
    staleTime: 30000,
  });
  const { data: todayCurrentClientCalls, isLoading: isLoadingTodayCurrentClientCalls } = useQuery({
    queryKey: ['currentClientCalls', 'today', formatDate(today)],
    queryFn: () => fetchCurrentClientCalls(todayBoundaries.start, todayBoundaries.end),
    staleTime: 30000,
  });

  // Past Client Calls (from call_logs where lead is in Past Clients stage)
  const fetchPastClientCalls = async (startTime?: string, endTime?: string) => {
    let query = supabase
      .from('call_logs')
      .select('id, timestamp, notes, lead_id, user_id, leads!inner(first_name, last_name, pipeline_stage_id), logged_by_user:users!call_logs_user_id_fkey(first_name, last_name)')
      .eq('leads.pipeline_stage_id', PAST_CLIENTS_STAGE_ID);
    
    if (startTime) query = query.gte('timestamp', startTime);
    if (endTime) query = query.lte('timestamp', endTime);
    
    // Order ascending (oldest first) so slot #1 = earliest date
    const { data, error } = await query.order('timestamp', { ascending: true });
    if (error) throw error;
    
    return (data || []).map(c => {
      const loggedByUser = c.logged_by_user as any;
      return {
        id: c.id,
        name: `${(c.leads as any)?.first_name || ''} ${(c.leads as any)?.last_name || ''}`.trim(),
        person_type: 'Lead' as const,
        call_date: c.timestamp,
        call_type: 'past_client',
        notes: c.notes,
        lead_id: c.lead_id,
        logged_by_name: loggedByUser ? `${loggedByUser.first_name || ''} ${loggedByUser.last_name || ''}`.trim() : null,
      };
    });
  };

  const { data: thisMonthPastClientCalls, isLoading: isLoadingThisMonthPastClientCalls } = useQuery({
    queryKey: ['pastClientCalls', 'thisMonth', formatDate(startOfMonth)],
    queryFn: () => fetchPastClientCalls(startOfMonth.toISOString(), startOfNextMonth.toISOString()),
    staleTime: 30000,
  });
  const { data: yesterdayPastClientCalls, isLoading: isLoadingYesterdayPastClientCalls } = useQuery({
    queryKey: ['pastClientCalls', 'yesterday', formatDate(yesterday)],
    queryFn: () => fetchPastClientCalls(yesterdayBoundaries.start, yesterdayBoundaries.end),
    staleTime: 30000,
  });
  const { data: todayPastClientCalls, isLoading: isLoadingTodayPastClientCalls } = useQuery({
    queryKey: ['pastClientCalls', 'today', formatDate(today)],
    queryFn: () => fetchPastClientCalls(todayBoundaries.start, todayBoundaries.end),
    staleTime: 30000,
  });

  // This Month's Calls (combined borrower calls + agent calls)
  const { data: thisMonthCalls, isLoading: isLoadingThisMonthCalls } = useQuery({
    queryKey: ['calls', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const startOfMonthTimestamp = startOfMonth.toISOString();
      const startOfNextMonthTimestamp = startOfNextMonth.toISOString();
      
      // Fetch borrower call logs
      const { data: borrowerCalls, error: borrowerError } = await supabase
        .from('call_logs')
        .select('id, timestamp, notes, lead_id, leads!inner(first_name, last_name)')
        .gte('timestamp', startOfMonthTimestamp)
        .lt('timestamp', startOfNextMonthTimestamp);
      
      if (borrowerError) throw borrowerError;
      
      // Fetch agent call logs
      const { data: agentCalls, error: agentError } = await supabase
        .from('agent_call_logs')
        .select('id, logged_at, summary, call_type, agent_id, buyer_agents!inner(first_name, last_name)')
        .eq('log_type', 'call')
        .gte('logged_at', startOfMonthTimestamp)
        .lt('logged_at', startOfNextMonthTimestamp);
      
      if (agentError) throw agentError;
      
      // Transform and combine
      const transformedBorrower: DashboardCall[] = (borrowerCalls || []).map(c => ({
        id: c.id,
        name: `${(c.leads as any)?.first_name || ''} ${(c.leads as any)?.last_name || ''}`.trim(),
        person_type: 'Lead' as const,
        call_date: c.timestamp,
        call_type: null,
        notes: c.notes,
        lead_id: c.lead_id,
      }));
      
      const transformedAgent: DashboardCall[] = (agentCalls || []).map(c => ({
        id: c.id,
        name: `${(c.buyer_agents as any)?.first_name || ''} ${(c.buyer_agents as any)?.last_name || ''}`.trim(),
        person_type: 'Agent' as const,
        call_date: c.logged_at,
        call_type: c.call_type,
        notes: c.summary,
        lead_id: null,
      }));
      
      // Combine and sort by date descending
      return [...transformedBorrower, ...transformedAgent].sort((a, b) => 
        new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
      );
    },
    staleTime: 30000,
  });

  // Yesterday's Calls
  const { data: yesterdayCalls, isLoading: isLoadingYesterdayCalls } = useQuery({
    queryKey: ['calls', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      // Fetch borrower call logs
      const { data: borrowerCalls, error: borrowerError } = await supabase
        .from('call_logs')
        .select('id, timestamp, notes, lead_id, leads!inner(first_name, last_name)')
        .gte('timestamp', yesterdayBoundaries.start)
        .lte('timestamp', yesterdayBoundaries.end);
      
      if (borrowerError) throw borrowerError;
      
      // Fetch agent call logs
      const { data: agentCalls, error: agentError } = await supabase
        .from('agent_call_logs')
        .select('id, logged_at, summary, call_type, agent_id, buyer_agents!inner(first_name, last_name)')
        .eq('log_type', 'call')
        .gte('logged_at', yesterdayBoundaries.start)
        .lte('logged_at', yesterdayBoundaries.end);
      
      if (agentError) throw agentError;
      
      // Transform and combine
      const transformedBorrower: DashboardCall[] = (borrowerCalls || []).map(c => ({
        id: c.id,
        name: `${(c.leads as any)?.first_name || ''} ${(c.leads as any)?.last_name || ''}`.trim(),
        person_type: 'Lead' as const,
        call_date: c.timestamp,
        call_type: null,
        notes: c.notes,
        lead_id: c.lead_id,
      }));
      
      const transformedAgent: DashboardCall[] = (agentCalls || []).map(c => ({
        id: c.id,
        name: `${(c.buyer_agents as any)?.first_name || ''} ${(c.buyer_agents as any)?.last_name || ''}`.trim(),
        person_type: 'Agent' as const,
        call_date: c.logged_at,
        call_type: c.call_type,
        notes: c.summary,
        lead_id: null,
      }));
      
      return [...transformedBorrower, ...transformedAgent].sort((a, b) => 
        new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
      );
    },
    staleTime: 30000,
  });

  // Today's Calls
  const { data: todayCalls, isLoading: isLoadingTodayCalls } = useQuery({
    queryKey: ['calls', 'today', formatDate(today)],
    queryFn: async () => {
      // Fetch borrower call logs
      const { data: borrowerCalls, error: borrowerError } = await supabase
        .from('call_logs')
        .select('id, timestamp, notes, lead_id, leads!inner(first_name, last_name)')
        .gte('timestamp', todayBoundaries.start)
        .lte('timestamp', todayBoundaries.end);
      
      if (borrowerError) throw borrowerError;
      
      // Fetch agent call logs
      const { data: agentCalls, error: agentError } = await supabase
        .from('agent_call_logs')
        .select('id, logged_at, summary, call_type, agent_id, buyer_agents!inner(first_name, last_name)')
        .eq('log_type', 'call')
        .gte('logged_at', todayBoundaries.start)
        .lte('logged_at', todayBoundaries.end);
      
      if (agentError) throw agentError;
      
      // Transform and combine
      const transformedBorrower: DashboardCall[] = (borrowerCalls || []).map(c => ({
        id: c.id,
        name: `${(c.leads as any)?.first_name || ''} ${(c.leads as any)?.last_name || ''}`.trim(),
        person_type: 'Lead' as const,
        call_date: c.timestamp,
        call_type: null,
        notes: c.notes,
        lead_id: c.lead_id,
      }));
      
      const transformedAgent: DashboardCall[] = (agentCalls || []).map(c => ({
        id: c.id,
        name: `${(c.buyer_agents as any)?.first_name || ''} ${(c.buyer_agents as any)?.last_name || ''}`.trim(),
        person_type: 'Agent' as const,
        call_date: c.logged_at,
        call_type: c.call_type,
        notes: c.summary,
        lead_id: null,
      }));
      
      return [...transformedBorrower, ...transformedAgent].sort((a, b) => 
        new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
      );
    },
    staleTime: 30000,
  });

  // All Calls
  const { data: allCalls, isLoading: isLoadingAllCalls } = useQuery({
    queryKey: ['calls', 'all'],
    queryFn: async () => {
      // Fetch borrower call logs
      const { data: borrowerCalls, error: borrowerError } = await supabase
        .from('call_logs')
        .select('id, timestamp, notes, lead_id, leads!inner(first_name, last_name)')
        .order('timestamp', { ascending: false })
        .limit(200);
      
      if (borrowerError) throw borrowerError;
      
      // Fetch agent call logs
      const { data: agentCalls, error: agentError } = await supabase
        .from('agent_call_logs')
        .select('id, logged_at, summary, call_type, agent_id, buyer_agents!inner(first_name, last_name)')
        .eq('log_type', 'call')
        .order('logged_at', { ascending: false })
        .limit(200);
      
      if (agentError) throw agentError;
      
      // Transform and combine
      const transformedBorrower: DashboardCall[] = (borrowerCalls || []).map(c => ({
        id: c.id,
        name: `${(c.leads as any)?.first_name || ''} ${(c.leads as any)?.last_name || ''}`.trim(),
        person_type: 'Lead' as const,
        call_date: c.timestamp,
        call_type: null,
        notes: c.notes,
        lead_id: c.lead_id,
      }));
      
      const transformedAgent: DashboardCall[] = (agentCalls || []).map(c => ({
        id: c.id,
        name: `${(c.buyer_agents as any)?.first_name || ''} ${(c.buyer_agents as any)?.last_name || ''}`.trim(),
        person_type: 'Agent' as const,
        call_date: c.logged_at,
        call_type: c.call_type,
        notes: c.summary,
        lead_id: null,
      }));
      
      return [...transformedBorrower, ...transformedAgent].sort((a, b) => 
        new Date(b.call_date).getTime() - new Date(a.call_date).getTime()
      );
    },
    staleTime: 30000,
  });

  // This Month's Emails
  const { data: thisMonthEmails, isLoading: isLoadingThisMonthEmails } = useQuery({
    queryKey: ['emails', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const startOfMonthTimestamp = startOfMonth.toISOString();
      const startOfNextMonthTimestamp = startOfNextMonth.toISOString();
      
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, lead_id, direction, from_email, to_email, subject, snippet, timestamp, delivery_status, ai_summary, leads!inner(first_name, last_name)')
        .gte('timestamp', startOfMonthTimestamp)
        .lt('timestamp', startOfNextMonthTimestamp)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(email => ({
        ...email,
        lead: email.leads as any
      })) as DashboardEmail[];
    },
    staleTime: 30000,
  });

  // Yesterday's Emails
  const { data: yesterdayEmails, isLoading: isLoadingYesterdayEmails } = useQuery({
    queryKey: ['emails', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, lead_id, direction, from_email, to_email, subject, snippet, timestamp, delivery_status, ai_summary, leads!inner(first_name, last_name)')
        .gte('timestamp', yesterdayBoundaries.start)
        .lte('timestamp', yesterdayBoundaries.end)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(email => ({
        ...email,
        lead: email.leads as any
      })) as DashboardEmail[];
    },
    staleTime: 30000,
  });

  // Today's Emails
  const { data: todayEmails, isLoading: isLoadingTodayEmails } = useQuery({
    queryKey: ['emails', 'today', formatDate(today)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, lead_id, direction, from_email, to_email, subject, snippet, timestamp, delivery_status, ai_summary, leads!inner(first_name, last_name)')
        .gte('timestamp', todayBoundaries.start)
        .lte('timestamp', todayBoundaries.end)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(email => ({
        ...email,
        lead: email.leads as any
      })) as DashboardEmail[];
    },
    staleTime: 30000,
  });

  // All Emails
  const { data: allEmails, isLoading: isLoadingAllEmails } = useQuery({
    queryKey: ['emails', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('id, lead_id, direction, from_email, to_email, subject, snippet, timestamp, delivery_status, ai_summary, leads!inner(first_name, last_name)')
        .order('timestamp', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return (data || []).map(email => ({
        ...email,
        lead: email.leads as any
      })) as DashboardEmail[];
    },
    staleTime: 30000,
  });

  // This Month's Reviews (leads with review_left_on date)
  const { data: thisMonthReviews, isLoading: isLoadingThisMonthReviews } = useQuery({
    queryKey: ['reviews', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, review_left_on, pipeline_stage_id')
        .not('review_left_on', 'is', null)
        .gte('review_left_on', formatDate(startOfMonth))
        .lt('review_left_on', formatDate(startOfNextMonth))
        .order('review_left_on', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Last Week's Reviews
  const { data: lastWeekReviews, isLoading: isLoadingLastWeekReviews } = useQuery({
    queryKey: ['reviews', 'lastWeek'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, review_left_on, pipeline_stage_id')
        .not('review_left_on', 'is', null)
        .gte('review_left_on', lastWeekRange.start.split('T')[0])
        .lte('review_left_on', lastWeekRange.end.split('T')[0])
        .order('review_left_on', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // This Week's Reviews
  const { data: thisWeekReviews, isLoading: isLoadingThisWeekReviews } = useQuery({
    queryKey: ['reviews', 'thisWeek'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, review_left_on, pipeline_stage_id')
        .not('review_left_on', 'is', null)
        .gte('review_left_on', thisWeekRange.start.split('T')[0])
        .lte('review_left_on', thisWeekRange.end.split('T')[0])
        .order('review_left_on', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // All Reviews
  const { data: allReviews, isLoading: isLoadingAllReviews } = useQuery({
    queryKey: ['reviews', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, review_left_on, pipeline_stage_id')
        .not('review_left_on', 'is', null)
        .order('review_left_on', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: recentStageChanges, isLoading: isLoadingStageChanges } = useQuery({
    queryKey: ['recentStageChanges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stage_history')
        .select(`
          id,
          changed_at,
          lead_id,
          from_stage:pipeline_stages!stage_history_from_stage_id_fkey(name),
          to_stage:pipeline_stages!stage_history_to_stage_id_fkey(name),
          lead:leads!inner(first_name, last_name)
        `)
        .order('changed_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Pipeline Stage Counts
  const { data: pipelineStageCounts, isLoading: isLoadingStageCounts } = useQuery({
    queryKey: ['pipelineStageCounts'],
    queryFn: async () => {
      // First, get all pipeline stages
      const { data: stages, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('id, name');
      
      if (stagesError) throw stagesError;
      
      // Then, get count of leads for each stage
      const stageCounts = await Promise.all(
        (stages || []).map(async (stage) => {
          const { count, error } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('pipeline_stage_id', stage.id);
          
          if (error) throw error;
          
          return {
            stage_id: stage.id,
            stage_name: stage.name,
            count: count || 0
          };
        })
      );
      
      // Sort by stage order
      const stageOrder = ['Leads', 'Pending App', 'Screening', 'Pre-Qualified', 'Pre-Approved', 'Active', 'Past Clients'];
      return stageCounts.sort((a, b) => 
        stageOrder.indexOf(a.stage_name) - stageOrder.indexOf(b.stage_name)
      );
    },
    staleTime: 30000,
  });

  // Helper functions for date ranges
  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    
    return { monday, friday };
  };

  const getMonthRanges = () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfterNextStart = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    
    return { currentMonthStart, nextMonthStart, monthAfterNextStart };
  };

  // Active pipeline metrics - Active stage ID
  const ACTIVE_STAGE_ID = '76eb2e82-e1d9-4f2d-a57d-2120a25696db';

  // Total Active Volume - Full Lead Data
  const { data: totalActiveLeads, isLoading: isLoadingTotalActive } = useQuery({
    queryKey: ['activeLeads', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Current Month Pending - Full Lead Data
  const { data: currentMonthLeads, isLoading: isLoadingCurrentMonthLeads } = useQuery({
    queryKey: ['activeLeads', 'currentMonth'],
    queryFn: async () => {
      const { currentMonthStart, nextMonthStart } = getMonthRanges();
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false)
        .gte('close_date', currentMonthStart.toISOString().split('T')[0])
        .lt('close_date', nextMonthStart.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Next Month Pending - Full Lead Data
  const { data: nextMonthLeads, isLoading: isLoadingNextMonthLeads } = useQuery({
    queryKey: ['activeLeads', 'nextMonth'],
    queryFn: async () => {
      const { nextMonthStart, monthAfterNextStart } = getMonthRanges();
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false)
        .gte('close_date', nextMonthStart.toISOString().split('T')[0])
        .lt('close_date', monthAfterNextStart.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // This Week Closing - Full Lead Data
  const { data: thisWeekLeads, isLoading: isLoadingThisWeekLeads } = useQuery({
    queryKey: ['activeLeads', 'thisWeek'],
    queryFn: async () => {
      const { monday, friday } = getCurrentWeekRange();
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false)
        .gte('close_date', monday.toISOString().split('T')[0])
        .lte('close_date', friday.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Total Active Volume & Units
  const { data: activeMetrics, isLoading: isLoadingActiveMetrics } = useQuery({
    queryKey: ['activeMetrics', 'totals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('loan_amount, interest_rate, submitted_at, ctc_at')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false);
      
      if (error) throw error;
      
      const totalUnits = data?.length || 0;
      const totalVolume = data?.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0) || 0;
      const avgInterestRate = data?.length 
        ? data.reduce((sum, lead) => sum + (lead.interest_rate || 0), 0) / data.filter(l => l.interest_rate).length
        : 0;
      const avgLoanAmount = totalUnits > 0 ? totalVolume / totalUnits : 0;
      
      // Calculate average clear-to-close time (in days)
      const ctcLeads = data?.filter(lead => lead.submitted_at && lead.ctc_at) || [];
      const avgCtcDays = ctcLeads.length > 0
        ? ctcLeads.reduce((sum, lead) => {
            const days = Math.floor(
              (new Date(lead.ctc_at!).getTime() - new Date(lead.submitted_at!).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / ctcLeads.length
        : null;
      
      return {
        total_units: totalUnits,
        total_volume: totalVolume,
        avg_interest_rate: avgInterestRate,
        avg_loan_amount: avgLoanAmount,
        avg_ctc_days: avgCtcDays,
      };
    },
    staleTime: 30000,
  });

  // Current Month Pending (Volume & Units)
  const { data: currentMonthPending, isLoading: isLoadingCurrentMonth } = useQuery({
    queryKey: ['activeMetrics', 'currentMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const { currentMonthStart, nextMonthStart } = getMonthRanges();
      
      const { data, error } = await supabase
        .from('leads')
        .select('loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false)
        .gte('close_date', currentMonthStart.toISOString().split('T')[0])
        .lt('close_date', nextMonthStart.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      return {
        current_month_units: data?.length || 0,
        current_month_volume: data?.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0) || 0,
      };
    },
    staleTime: 30000,
  });

  // Next Month Pending (Volume & Units)
  const { data: nextMonthPending, isLoading: isLoadingNextMonth } = useQuery({
    queryKey: ['activeMetrics', 'nextMonth', formatDate(startOfNextMonth)],
    queryFn: async () => {
      const { nextMonthStart, monthAfterNextStart } = getMonthRanges();
      
      const { data, error } = await supabase
        .from('leads')
        .select('loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false)
        .gte('close_date', nextMonthStart.toISOString().split('T')[0])
        .lt('close_date', monthAfterNextStart.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      return {
        next_month_units: data?.length || 0,
        next_month_volume: data?.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0) || 0,
      };
    },
    staleTime: 30000,
  });

  // Closing This Week (Volume & Units)
  const { data: thisWeekClosing, isLoading: isLoadingThisWeek } = useQuery({
    queryKey: ['activeMetrics', 'thisWeek'],
    queryFn: async () => {
      const { monday, friday } = getCurrentWeekRange();
      
      const { data, error } = await supabase
        .from('leads')
        .select('loan_amount, close_date')
        .eq('pipeline_stage_id', ACTIVE_STAGE_ID)
        .eq('is_closed', false)
        .gte('close_date', monday.toISOString().split('T')[0])
        .lte('close_date', friday.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      return {
        this_week_units: data?.length || 0,
        this_week_volume: data?.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0) || 0,
      };
    },
    staleTime: 30000,
  });

  // Closed/Past Clients metrics - 2025 YTD (Full Lead Data)
  const { data: closedYtdLeads, isLoading: isLoadingClosedYtdLeads } = useQuery({
    queryKey: ['closedLeads', 'ytd2025'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, closed_at')
        .eq('is_closed', true)
        .gte('closed_at', '2025-01-01T00:00:00')
        .lt('closed_at', '2026-01-01T00:00:00');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Closed YTD Metrics (aggregated)
  const { data: closedYtdMetrics, isLoading: isLoadingClosedYtd } = useQuery({
    queryKey: ['closedMetrics', 'ytd2025'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('loan_amount')
        .eq('is_closed', true)
        .gte('closed_at', '2025-01-01T00:00:00')
        .lt('closed_at', '2026-01-01T00:00:00');
      
      if (error) throw error;
      
      const ytdUnits = data?.length || 0;
      const ytdVolume = data?.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0) || 0;
      const avgLoanAmount = ytdUnits > 0 ? ytdVolume / ytdUnits : 0;
      
      return {
        ytd_units: ytdUnits,
        ytd_volume: ytdVolume,
        avg_loan_amount: avgLoanAmount,
      };
    },
    staleTime: 30000,
  });

  // Closed - 2025 Monthly Leads (Full Data)
  const { data: closedMonthlyLeads, isLoading: isLoadingClosedMonthlyLeads } = useQuery({
    queryKey: ['closedLeads', 'monthly2025'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, loan_amount, closed_at')
        .eq('is_closed', true)
        .gte('closed_at', '2025-01-01T00:00:00')
        .lt('closed_at', '2026-01-01T00:00:00');
      
      if (error) throw error;
      
      // Group by month
      const monthlyMap = new Map<number, any[]>();
      data?.forEach(lead => {
        if (lead.closed_at) {
          const month = new Date(lead.closed_at).getMonth() + 1;
          if (!monthlyMap.has(month)) monthlyMap.set(month, []);
          monthlyMap.get(month)!.push(lead);
        }
      });
      
      return monthlyMap;
    },
    staleTime: 30000,
  });

  // Closed - 2025 Monthly Volume
  const { data: closedMonthlyVolume, isLoading: isLoadingClosedVolume } = useQuery({
    queryKey: ['closedMetrics', 'monthlyVolume2025'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('loan_amount, closed_at')
        .eq('is_closed', true)
        .gte('closed_at', '2025-01-01T00:00:00')
        .lt('closed_at', '2026-01-01T00:00:00');
      
      if (error) throw error;
      
      // Group by month
      const monthlyMap = new Map<number, number>();
      data?.forEach(lead => {
        if (lead.closed_at) {
          const month = new Date(lead.closed_at).getMonth() + 1;
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + (lead.loan_amount || 0));
        }
      });
      
      return Array.from(monthlyMap.entries()).map(([month_num, volume]) => ({
        month_num,
        volume,
      }));
    },
    staleTime: 30000,
  });

  // Closed - 2025 Monthly Units
  const { data: closedMonthlyUnits, isLoading: isLoadingClosedUnits } = useQuery({
    queryKey: ['closedMetrics', 'monthlyUnits2025'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('closed_at')
        .eq('is_closed', true)
        .gte('closed_at', '2025-01-01T00:00:00')
        .lt('closed_at', '2026-01-01T00:00:00');
      
      if (error) throw error;
      
      // Group by month
      const monthlyMap = new Map<number, number>();
      data?.forEach(lead => {
        if (lead.closed_at) {
          const month = new Date(lead.closed_at).getMonth() + 1;
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
        }
      });
      
      return Array.from(monthlyMap.entries()).map(([month_num, units]) => ({
        month_num,
        units,
      }));
    },
    staleTime: 30000,
  });

  // All leads across all pipeline stages
  const { data: allPipelineLeads, isLoading: isLoadingAllPipelineLeads } = useQuery({
    queryKey: ['allPipelineLeads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          lead_on_date,
          created_at,
          pipeline_stage_id,
          pipeline_stages!inner(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform to include stage name
      return (data || []).map(lead => ({
        ...lead,
        stage_name: (lead.pipeline_stages as any)?.name || 'Unknown'
      }));
    },
    staleTime: 30000,
  });

  const isLoading =
    isLoadingThisMonthLeads ||
    isLoadingYesterdayLeads ||
    isLoadingTodayLeads ||
    isLoadingLastWeekLeads ||
    isLoadingThisWeekLeadsData ||
    isLoadingAllLeads ||
    isLoadingThisMonthApps ||
    isLoadingYesterdayApps ||
    isLoadingTodayApps ||
    isLoadingLastWeekApps ||
    isLoadingThisWeekApps ||
    isLoadingAllApps ||
    isLoadingThisMonthMeetings ||
    isLoadingLastWeekMeetings ||
    isLoadingThisWeekMeetings ||
    isLoadingYesterdayMeetings ||
    isLoadingTodayMeetings ||
    isLoadingAllMeetings ||
    isLoadingThisMonthBrokerOpens ||
    isLoadingLastWeekBrokerOpens ||
    isLoadingThisWeekBrokerOpens ||
    isLoadingYesterdayBrokerOpens ||
    isLoadingTodayBrokerOpens ||
    isLoadingAllBrokerOpens ||
    isLoadingThisMonthCalls ||
    isLoadingYesterdayCalls ||
    isLoadingTodayCalls ||
    isLoadingAllCalls ||
    isLoadingThisMonthEmails ||
    isLoadingYesterdayEmails ||
    isLoadingTodayEmails ||
    isLoadingAllEmails ||
    isLoadingThisMonthReviews ||
    isLoadingLastWeekReviews ||
    isLoadingThisWeekReviews ||
    isLoadingAllReviews ||
    isLoadingStageChanges ||
    isLoadingStageCounts ||
    isLoadingCurrentMonth ||
    isLoadingNextMonth ||
    isLoadingThisWeek ||
    isLoadingTotalActive ||
    isLoadingCurrentMonthLeads ||
    isLoadingNextMonthLeads ||
    isLoadingThisWeekLeads ||
    isLoadingClosedYtdLeads ||
    isLoadingClosedMonthlyLeads ||
    isLoadingClosedYtd ||
    isLoadingClosedVolume ||
    isLoadingClosedUnits ||
    isLoadingAllPipelineLeads ||
    isLoadingThisMonthNewAgentCalls ||
    isLoadingYesterdayNewAgentCalls ||
    isLoadingTodayNewAgentCalls ||
    isLoadingThisMonthCurrentAgentCalls ||
    isLoadingYesterdayCurrentAgentCalls ||
    isLoadingTodayCurrentAgentCalls ||
    isLoadingThisMonthTopAgentCalls ||
    isLoadingYesterdayTopAgentCalls ||
    isLoadingTodayTopAgentCalls ||
    isLoadingThisMonthPastLACalls ||
    isLoadingYesterdayPastLACalls ||
    isLoadingTodayPastLACalls ||
    isLoadingThisMonthPastClientCalls ||
    isLoadingYesterdayPastClientCalls ||
    isLoadingTodayPastClientCalls ||
    isLoadingThisMonthCurrentClientCalls ||
    isLoadingYesterdayCurrentClientCalls ||
    isLoadingTodayCurrentClientCalls;

  return {
    thisMonthLeads: thisMonthLeads || [],
    yesterdayLeads: yesterdayLeads || [],
    todayLeads: todayLeads || [],
    lastWeekLeads: lastWeekLeads || [],
    thisWeekLeadsData: thisWeekLeadsData || [],
    allLeads: allLeads || [],
    thisMonthApps: thisMonthApps || [],
    yesterdayApps: yesterdayApps || [],
    todayApps: todayApps || [],
    lastWeekApps: lastWeekApps || [],
    thisWeekApps: thisWeekApps || [],
    allApplications: allApplications || [],
    thisMonthMeetings: thisMonthMeetings || [],
    lastWeekMeetings: lastWeekMeetings || [],
    thisWeekMeetings: thisWeekMeetings || [],
    yesterdayMeetings: yesterdayMeetings || [],
    todayMeetings: todayMeetings || [],
    allMeetings: allMeetings || [],
    // Broker Opens
    thisMonthBrokerOpens: thisMonthBrokerOpens || [],
    lastWeekBrokerOpens: lastWeekBrokerOpens || [],
    thisWeekBrokerOpens: thisWeekBrokerOpens || [],
    yesterdayBrokerOpens: yesterdayBrokerOpens || [],
    todayBrokerOpens: todayBrokerOpens || [],
    allBrokerOpens: allBrokerOpens || [],
    // Combined Calls (existing)
    thisMonthCalls: thisMonthCalls || [],
    yesterdayCalls: yesterdayCalls || [],
    todayCalls: todayCalls || [],
    allCalls: allCalls || [],
    // Call Type Breakdowns
    thisMonthNewAgentCalls: thisMonthNewAgentCalls || [],
    yesterdayNewAgentCalls: yesterdayNewAgentCalls || [],
    todayNewAgentCalls: todayNewAgentCalls || [],
    thisMonthCurrentAgentCalls: thisMonthCurrentAgentCalls || [],
    yesterdayCurrentAgentCalls: yesterdayCurrentAgentCalls || [],
    todayCurrentAgentCalls: todayCurrentAgentCalls || [],
    thisMonthTopAgentCalls: thisMonthTopAgentCalls || [],
    yesterdayTopAgentCalls: yesterdayTopAgentCalls || [],
    todayTopAgentCalls: todayTopAgentCalls || [],
    thisMonthPastLACalls: thisMonthPastLACalls || [],
    yesterdayPastLACalls: yesterdayPastLACalls || [],
    todayPastLACalls: todayPastLACalls || [],
    thisMonthPastClientCalls: thisMonthPastClientCalls || [],
    yesterdayPastClientCalls: yesterdayPastClientCalls || [],
    todayPastClientCalls: todayPastClientCalls || [],
    // Current Client Calls (leads in active pipeline stages)
    thisMonthCurrentClientCalls: thisMonthCurrentClientCalls || [],
    yesterdayCurrentClientCalls: yesterdayCurrentClientCalls || [],
    todayCurrentClientCalls: todayCurrentClientCalls || [],
    // Emails
    thisMonthEmails: thisMonthEmails || [],
    yesterdayEmails: yesterdayEmails || [],
    todayEmails: todayEmails || [],
    allEmails: allEmails || [],
    // Reviews
    thisMonthReviews: thisMonthReviews || [],
    lastWeekReviews: lastWeekReviews || [],
    thisWeekReviews: thisWeekReviews || [],
    allReviews: allReviews || [],
    recentStageChanges: recentStageChanges || [],
    pipelineStageCounts: pipelineStageCounts || [],
    activeMetrics: activeMetrics || { total_units: 0, total_volume: 0, avg_interest_rate: 0, avg_loan_amount: 0, avg_ctc_days: null },
    currentMonthPending: currentMonthPending || { current_month_units: 0, current_month_volume: 0 },
    nextMonthPending: nextMonthPending || { next_month_units: 0, next_month_volume: 0 },
    thisWeekClosing: thisWeekClosing || { this_week_units: 0, this_week_volume: 0 },
    totalActiveLeads: totalActiveLeads || [],
    currentMonthLeads: currentMonthLeads || [],
    nextMonthLeads: nextMonthLeads || [],
    thisWeekLeads: thisWeekLeads || [],
    closedYtdLeads: closedYtdLeads || [],
    closedMonthlyLeads: closedMonthlyLeads || new Map(),
    closedYtdMetrics: closedYtdMetrics || { ytd_units: 0, ytd_volume: 0, avg_loan_amount: 0 },
    closedMonthlyVolume: closedMonthlyVolume || [],
    closedMonthlyUnits: closedMonthlyUnits || [],
    allPipelineLeads: allPipelineLeads || [],
    isLoading,
  };
};
