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
}

export interface DashboardCall {
  id: string;
  first_name: string;
  last_name: string;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
  last_agent_call: string;
  notes?: string | null;
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
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
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
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
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
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
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
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
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
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', startOfMonthTimestamp)
        .lt('app_complete_at', startOfNextMonthTimestamp)
        .order('app_complete_at', { ascending: false });
      
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
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', yesterdayStart.toISOString())
        .lte('app_complete_at', yesterdayEnd.toISOString())
        .order('app_complete_at', { ascending: false });
      
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
        .select('id, first_name, last_name, phone, email, lead_on_date, app_complete_at, pipeline_stage_id')
        .not('app_complete_at', 'is', null)
        .gte('app_complete_at', todayStart.toISOString())
        .lte('app_complete_at', todayEnd.toISOString())
        .order('app_complete_at', { ascending: false });
      
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
        .not('app_complete_at', 'is', null)
        .order('app_complete_at', { ascending: false });
      
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
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, face_to_face_meeting, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call, notes')
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
        .select('id, first_name, last_name, brokerage, email, phone, last_agent_call, notes')
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

  // Closed/Past Clients metrics - 2025 YTD
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
    isLoadingStageCounts ||
    isLoadingActiveMetrics ||
    isLoadingCurrentMonth ||
    isLoadingNextMonth ||
    isLoadingThisWeek ||
    isLoadingClosedYtd ||
    isLoadingClosedVolume ||
    isLoadingClosedUnits;

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
    activeMetrics: activeMetrics || { total_units: 0, total_volume: 0, avg_interest_rate: 0, avg_loan_amount: 0, avg_ctc_days: null },
    currentMonthPending: currentMonthPending || { current_month_units: 0, current_month_volume: 0 },
    nextMonthPending: nextMonthPending || { next_month_units: 0, next_month_volume: 0 },
    thisWeekClosing: thisWeekClosing || { this_week_units: 0, this_week_volume: 0 },
    closedYtdMetrics: closedYtdMetrics || { ytd_units: 0, ytd_volume: 0, avg_loan_amount: 0 },
    closedMonthlyVolume: closedMonthlyVolume || [],
    closedMonthlyUnits: closedMonthlyUnits || [],
    isLoading,
  };
};
