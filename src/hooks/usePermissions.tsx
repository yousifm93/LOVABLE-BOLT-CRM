import { useState, useEffect, useCallback } from "react";
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
};

export function usePermissions() {
  const { crmUser } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!crmUser?.id) {
      setLoading(false);
      return;
    }

    // Admins get full access - no need to fetch permissions
    if (crmUser.role === 'Admin') {
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', crmUser.id)
        .single();

      if (error) {
        // If no permissions found, default to visible for non-admin sections
        if (error.code === 'PGRST116') {
          setPermissions({
            ...DEFAULT_PERMISSIONS,
            admin: 'hidden', // Default non-admins to hidden admin
          });
        } else {
          console.error('Error fetching permissions:', error);
          setPermissions(DEFAULT_PERMISSIONS);
        }
      } else if (data) {
        setPermissions({
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
        });
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [crmUser?.id, crmUser?.role]);

  // Initial fetch
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Real-time subscription for permission changes
  useEffect(() => {
    if (!crmUser?.id || crmUser.role === 'Admin') {
      return;
    }

    const channel = supabase
      .channel(`user_permissions_${crmUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_id=eq.${crmUser.id}`
        },
        (payload) => {
          console.log('Permission change detected:', payload);
          fetchPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [crmUser?.id, crmUser?.role, fetchPermissions]);

  const hasPermission = useCallback((section: keyof UserPermissions): PermissionLevel => {
    if (!permissions) return 'visible';
    return (permissions[section] as PermissionLevel) || 'visible';
  }, [permissions]);

  const isAdmin = crmUser?.role === 'Admin';

  return { 
    permissions, 
    hasPermission, 
    loading,
    isAdmin,
  };
}
