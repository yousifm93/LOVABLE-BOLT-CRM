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

  const isLoading = 
    isLoadingThisMonthLeads || 
    isLoadingYesterdayLeads || 
    isLoadingAllLeads || 
    isLoadingThisMonthApps || 
    isLoadingYesterdayApps || 
    isLoadingAllApps;

  return {
    thisMonthLeads: thisMonthLeads || [],
    yesterdayLeads: yesterdayLeads || [],
    allLeads: allLeads || [],
    thisMonthApps: thisMonthApps || [],
    yesterdayApps: yesterdayApps || [],
    allApplications: allApplications || [],
    isLoading,
  };
};
