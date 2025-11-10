import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_on_date: string;
  pending_app_at: string | null;
}

export interface DashboardFaceToFaceMeeting {
  id: string;
  first_name: string;
  last_name: string;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
  face_to_face_meeting: string;
}

export interface DashboardCall {
  id: string;
  first_name: string;
  last_name: string;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
  last_agent_call: string;
}

export const useDashboardData = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // This Month's Leads
  const { data: thisMonthLeads, isLoading: isLoadingThisMonthLeads } = useQuery({
    queryKey: ['leads', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
        .gte('lead_on_date', formatDate(startOfMonth))
        .lt('lead_on_date', formatDate(startOfNextMonth))
        .order('lead_on_date', { ascending: false });
      
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
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
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
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
        .eq('lead_on_date', formatDate(today))
        .order('created_at', { ascending: false });
      
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
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
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
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
        .not('pending_app_at', 'is', null)
        .gte('pending_app_at', startOfMonthTimestamp)
        .lt('pending_app_at', startOfNextMonthTimestamp)
        .order('pending_app_at', { ascending: false });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Yesterday's Apps
  const { data: yesterdayApps, isLoading: isLoadingYesterdayApps } = useQuery({
    queryKey: ['applications', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
        .not('pending_app_at', 'is', null)
        .gte('pending_app_at', yesterdayStart.toISOString())
        .lte('pending_app_at', yesterdayEnd.toISOString())
        .order('pending_app_at', { ascending: false });
      
      if (error) throw error;
      return data as DashboardLead[];
    },
    staleTime: 30000,
  });

  // Today's Apps
  const { data: todayApps, isLoading: isLoadingTodayApps } = useQuery({
    queryKey: ['applications', 'today', formatDate(today)],
    queryFn: async () => {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
        .not('pending_app_at', 'is', null)
        .gte('pending_app_at', todayStart.toISOString())
        .lte('pending_app_at', todayEnd.toISOString())
        .order('pending_app_at', { ascending: false });
      
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
        .select('id, first_name, last_name, phone, email, lead_on_date, pending_app_at')
        .not('pending_app_at', 'is', null)
        .order('pending_app_at', { ascending: false });
      
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
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting')
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', startOfMonthTimestamp)
        .lt('face_to_face_meeting', startOfNextMonthTimestamp)
        .order('face_to_face_meeting', { ascending: false });
      
      if (error) throw error;
      return data as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // Yesterday's Face-to-Face Meetings
  const { data: yesterdayMeetings, isLoading: isLoadingYesterdayMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting')
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', yesterdayStart.toISOString())
        .lte('face_to_face_meeting', yesterdayEnd.toISOString())
        .order('face_to_face_meeting', { ascending: false });
      
      if (error) throw error;
      return data as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // Today's Face-to-Face Meetings
  const { data: todayMeetings, isLoading: isLoadingTodayMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'today', formatDate(today)],
    queryFn: async () => {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting')
        .not('face_to_face_meeting', 'is', null)
        .gte('face_to_face_meeting', todayStart.toISOString())
        .lte('face_to_face_meeting', todayEnd.toISOString())
        .order('face_to_face_meeting', { ascending: false });
      
      if (error) throw error;
      return data as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // All Face-to-Face Meetings
  const { data: allMeetings, isLoading: isLoadingAllMeetings } = useQuery({
    queryKey: ['faceToFaceMeetings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting')
        .not('face_to_face_meeting', 'is', null)
        .order('face_to_face_meeting', { ascending: false });
      
      if (error) throw error;
      return data as DashboardFaceToFaceMeeting[];
    },
    staleTime: 30000,
  });

  // This Month's Calls
  const { data: thisMonthCalls, isLoading: isLoadingThisMonthCalls } = useQuery({
    queryKey: ['calls', 'thisMonth', formatDate(startOfMonth)],
    queryFn: async () => {
      const startOfMonthTimestamp = startOfMonth.toISOString();
      const startOfNextMonthTimestamp = startOfNextMonth.toISOString();
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call')
        .not('last_agent_call', 'is', null)
        .gte('last_agent_call', startOfMonthTimestamp)
        .lt('last_agent_call', startOfNextMonthTimestamp)
        .order('last_agent_call', { ascending: false });
      
      if (error) throw error;
      return data as DashboardCall[];
    },
    staleTime: 30000,
  });

  // Yesterday's Calls
  const { data: yesterdayCalls, isLoading: isLoadingYesterdayCalls } = useQuery({
    queryKey: ['calls', 'yesterday', formatDate(yesterday)],
    queryFn: async () => {
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call')
        .not('last_agent_call', 'is', null)
        .gte('last_agent_call', yesterdayStart.toISOString())
        .lte('last_agent_call', yesterdayEnd.toISOString())
        .order('last_agent_call', { ascending: false });
      
      if (error) throw error;
      return data as DashboardCall[];
    },
    staleTime: 30000,
  });

  // Today's Calls
  const { data: todayCalls, isLoading: isLoadingTodayCalls } = useQuery({
    queryKey: ['calls', 'today', formatDate(today)],
    queryFn: async () => {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call')
        .not('last_agent_call', 'is', null)
        .gte('last_agent_call', todayStart.toISOString())
        .lte('last_agent_call', todayEnd.toISOString())
        .order('last_agent_call', { ascending: false });
      
      if (error) throw error;
      return data as DashboardCall[];
    },
    staleTime: 30000,
  });

  // All Calls
  const { data: allCalls, isLoading: isLoadingAllCalls } = useQuery({
    queryKey: ['calls', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call')
        .not('last_agent_call', 'is', null)
        .order('last_agent_call', { ascending: false });
      
      if (error) throw error;
      return data as DashboardCall[];
    },
    staleTime: 30000,
  });

  // Recent Stage Changes
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

  const isLoading = 
    isLoadingThisMonthLeads || 
    isLoadingYesterdayLeads || 
    isLoadingTodayLeads ||
    isLoadingAllLeads || 
    isLoadingThisMonthApps || 
    isLoadingYesterdayApps || 
    isLoadingTodayApps ||
    isLoadingAllApps ||
    isLoadingThisMonthMeetings ||
    isLoadingYesterdayMeetings ||
    isLoadingTodayMeetings ||
    isLoadingAllMeetings ||
    isLoadingThisMonthCalls ||
    isLoadingYesterdayCalls ||
    isLoadingTodayCalls ||
    isLoadingAllCalls ||
    isLoadingStageChanges ||
    isLoadingStageCounts;

  return {
    thisMonthLeads: thisMonthLeads || [],
    yesterdayLeads: yesterdayLeads || [],
    todayLeads: todayLeads || [],
    allLeads: allLeads || [],
    thisMonthApps: thisMonthApps || [],
    yesterdayApps: yesterdayApps || [],
    todayApps: todayApps || [],
    allApplications: allApplications || [],
    thisMonthMeetings: thisMonthMeetings || [],
    yesterdayMeetings: yesterdayMeetings || [],
    todayMeetings: todayMeetings || [],
    allMeetings: allMeetings || [],
    thisMonthCalls: thisMonthCalls || [],
    yesterdayCalls: yesterdayCalls || [],
    todayCalls: todayCalls || [],
    allCalls: allCalls || [],
    recentStageChanges: recentStageChanges || [],
    pipelineStageCounts: pipelineStageCounts || [],
    isLoading,
  };
};
