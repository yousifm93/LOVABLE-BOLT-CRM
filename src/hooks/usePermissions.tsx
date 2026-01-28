import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPermissions {
  // Top-level sections
  home: string;
  dashboard: string;
  overview: string;
  tasks: string;
  email: string;
  pipeline: string;
  contacts: string;
  resources: string;
  calculators: string;
  admin: string;
  // Dashboard tabs
  dashboard_sales: string;
  dashboard_calls: string;
  dashboard_active: string;
  dashboard_closed: string;
  dashboard_miscellaneous: string;
  dashboard_all: string;
  // Pipeline sub-items
  pipeline_leads: string;
  pipeline_pending_app: string;
  pipeline_screening: string;
  pipeline_pre_qualified: string;
  pipeline_pre_approved: string;
  pipeline_active: string;
  pipeline_past_clients: string;
  pipeline_idle: string;
  // Contacts sub-items
  contacts_agents: string;
  contacts_borrowers: string;
  contacts_lenders: string;
  // Calculators sub-items
  calculators_loan_pricer: string;
  calculators_property_value: string;
  calculators_income: string;
  calculators_estimate: string;
  // Resources sub-items
  resources_bolt_bot: string;
  resources_email_marketing: string;
  resources_condolist: string;
  resources_preapproval: string;
  // Admin sub-items
  admin_assistant: string;
  admin_mortgage_app: string;
  admin_settings: string;
  admin_deleted_items: string;
  // Homepage card permissions
  home_inbox: string;
  home_calendar: string;
  home_agents: string;
  home_lenders: string;
  home_active_files: string;
  home_loan_estimate: string;
  home_income_calculator: string;
  home_loan_pricer: string;
  home_bolt_bot: string;
  // New homepage section permissions
  home_activity_panel: string;
  home_market_rates: string;
  home_daily_reports: string;
  home_monthly_reports: string;
  // New fine-grained permissions
  default_landing_page: string;
  lead_details_all_fields: string;
  lead_details_send_email: string;
  filter_leads_by_assignment: boolean;
  // Sidebar behavior
  sidebar_pipeline_expanded_default: boolean;
}

type PermissionLevel = 'visible' | 'hidden' | 'locked';

const DEFAULT_PERMISSIONS: UserPermissions = {
  // Top-level sections
  home: 'visible',
  dashboard: 'visible',
  overview: 'visible',
  tasks: 'visible',
  email: 'visible',
  pipeline: 'visible',
  contacts: 'visible',
  resources: 'visible',
  calculators: 'visible',
  admin: 'visible',
  // Dashboard tabs
  dashboard_sales: 'visible',
  dashboard_calls: 'visible',
  dashboard_active: 'visible',
  dashboard_closed: 'visible',
  dashboard_miscellaneous: 'visible',
  dashboard_all: 'visible',
  // Pipeline sub-items
  pipeline_leads: 'visible',
  pipeline_pending_app: 'visible',
  pipeline_screening: 'visible',
  pipeline_pre_qualified: 'visible',
  pipeline_pre_approved: 'visible',
  pipeline_active: 'visible',
  pipeline_past_clients: 'visible',
  pipeline_idle: 'visible',
  // Contacts sub-items
  contacts_agents: 'visible',
  contacts_borrowers: 'visible',
  contacts_lenders: 'visible',
  // Calculators sub-items
  calculators_loan_pricer: 'visible',
  calculators_property_value: 'visible',
  calculators_income: 'visible',
  calculators_estimate: 'visible',
  // Resources sub-items
  resources_bolt_bot: 'visible',
  resources_email_marketing: 'visible',
  resources_condolist: 'visible',
  resources_preapproval: 'visible',
  // Admin sub-items
  admin_assistant: 'visible',
  admin_mortgage_app: 'visible',
  admin_settings: 'visible',
  admin_deleted_items: 'visible',
  // Homepage card permissions
  home_inbox: 'visible',
  home_calendar: 'visible',
  home_agents: 'visible',
  home_lenders: 'visible',
  home_active_files: 'visible',
  home_loan_estimate: 'visible',
  home_income_calculator: 'visible',
  home_loan_pricer: 'visible',
  home_bolt_bot: 'visible',
  // New homepage section permissions
  home_activity_panel: 'visible',
  home_market_rates: 'visible',
  home_daily_reports: 'visible',
  home_monthly_reports: 'visible',
  // New fine-grained permissions
  default_landing_page: '/',
  lead_details_all_fields: 'visible',
  lead_details_send_email: 'visible',
  filter_leads_by_assignment: false,
  // Sidebar behavior
  sidebar_pipeline_expanded_default: false,
};

export function usePermissions() {
  const { crmUser } = useAuth();

  // Use React Query for permissions caching
  const { data: permissions, isLoading: loading } = useQuery({
    queryKey: ['permissions', crmUser?.id, crmUser?.role],
    queryFn: async () => {
      if (!crmUser?.id) return DEFAULT_PERMISSIONS;

      // Admins get full access - no need to fetch permissions
      if (crmUser.role === 'Admin') {
        return DEFAULT_PERMISSIONS;
      }

      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', crmUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching permissions:', error);
        return { ...DEFAULT_PERMISSIONS, admin: 'hidden' };
      }
      
      if (!data) {
        // No permissions found, default to hidden admin for non-admins
        return { ...DEFAULT_PERMISSIONS, admin: 'hidden' };
      }

      return {
        // Top-level sections
        home: data.home || 'visible',
        dashboard: data.dashboard || 'visible',
        overview: data.overview || 'visible',
        tasks: data.tasks || 'visible',
        email: data.email || 'visible',
        pipeline: data.pipeline || 'visible',
        contacts: data.contacts || 'visible',
        resources: data.resources || 'visible',
        calculators: data.calculators || 'visible',
        admin: data.admin || 'hidden',
        // Dashboard tabs
        dashboard_sales: data.dashboard_sales || 'visible',
        dashboard_calls: data.dashboard_calls || 'visible',
        dashboard_active: data.dashboard_active || 'visible',
        dashboard_closed: data.dashboard_closed || 'visible',
        dashboard_miscellaneous: data.dashboard_miscellaneous || 'visible',
        dashboard_all: data.dashboard_all || 'visible',
        // Pipeline sub-items
        pipeline_leads: data.pipeline_leads || 'visible',
        pipeline_pending_app: data.pipeline_pending_app || 'visible',
        pipeline_screening: data.pipeline_screening || 'visible',
        pipeline_pre_qualified: data.pipeline_pre_qualified || 'visible',
        pipeline_pre_approved: data.pipeline_pre_approved || 'visible',
        pipeline_active: data.pipeline_active || 'visible',
        pipeline_past_clients: data.pipeline_past_clients || 'visible',
        pipeline_idle: (data as any).pipeline_idle || 'visible',
        // Contacts sub-items
        contacts_agents: data.contacts_agents || 'visible',
        contacts_borrowers: data.contacts_borrowers || 'visible',
        contacts_lenders: data.contacts_lenders || 'visible',
        // Calculators sub-items
        calculators_loan_pricer: data.calculators_loan_pricer || 'visible',
        calculators_property_value: data.calculators_property_value || 'visible',
        calculators_income: data.calculators_income || 'visible',
        calculators_estimate: data.calculators_estimate || 'visible',
        // Resources sub-items
        resources_bolt_bot: data.resources_bolt_bot || 'visible',
        resources_email_marketing: data.resources_email_marketing || 'visible',
        resources_condolist: data.resources_condolist || 'visible',
        resources_preapproval: data.resources_preapproval || 'visible',
        // Admin sub-items
        admin_assistant: data.admin_assistant || 'visible',
        admin_mortgage_app: data.admin_mortgage_app || 'visible',
        admin_settings: data.admin_settings || 'visible',
        admin_deleted_items: data.admin_deleted_items || 'visible',
        // Homepage card permissions
        home_inbox: data.home_inbox || 'visible',
        home_calendar: data.home_calendar || 'visible',
        home_agents: data.home_agents || 'visible',
        home_lenders: data.home_lenders || 'visible',
        home_active_files: data.home_active_files || 'visible',
        home_loan_estimate: data.home_loan_estimate || 'visible',
        home_income_calculator: data.home_income_calculator || 'visible',
        home_loan_pricer: data.home_loan_pricer || 'visible',
        home_bolt_bot: data.home_bolt_bot || 'visible',
        // New homepage section permissions
        home_activity_panel: (data as any).home_activity_panel || 'visible',
        home_market_rates: (data as any).home_market_rates || 'visible',
        home_daily_reports: (data as any).home_daily_reports || 'visible',
        home_monthly_reports: (data as any).home_monthly_reports || 'visible',
        // New fine-grained permissions
        default_landing_page: (data as any).default_landing_page || '/',
        lead_details_all_fields: (data as any).lead_details_all_fields || 'visible',
        lead_details_send_email: (data as any).lead_details_send_email || 'visible',
        filter_leads_by_assignment: (data as any).filter_leads_by_assignment || false,
        // Sidebar behavior
        sidebar_pipeline_expanded_default: (data as any).sidebar_pipeline_expanded_default || false,
      } as UserPermissions;
    },
    enabled: !!crmUser?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const hasPermission = useCallback((section: keyof UserPermissions): PermissionLevel => {
    if (!permissions) return 'visible';
    return (permissions[section] as PermissionLevel) || 'visible';
  }, [permissions]);

  const isAdmin = crmUser?.role === 'Admin';

  return { 
    permissions: permissions || null, 
    hasPermission, 
    loading,
    isAdmin,
  };
}
