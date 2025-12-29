import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPermissions {
  overview: string;
  tasks: string;
  pipeline: string;
  contacts: string;
  resources: string;
  calculators: string;
  admin: string;
  pipeline_leads: string;
  pipeline_pending_app: string;
  pipeline_screening: string;
  pipeline_pre_qualified: string;
  pipeline_pre_approved: string;
  pipeline_active: string;
  pipeline_past_clients: string;
}

type PermissionLevel = 'visible' | 'hidden' | 'locked';

const DEFAULT_PERMISSIONS: UserPermissions = {
  overview: 'visible',
  tasks: 'visible',
  pipeline: 'visible',
  contacts: 'visible',
  resources: 'visible',
  calculators: 'visible',
  admin: 'visible',
  pipeline_leads: 'visible',
  pipeline_pending_app: 'visible',
  pipeline_screening: 'visible',
  pipeline_pre_qualified: 'visible',
  pipeline_pre_approved: 'visible',
  pipeline_active: 'visible',
  pipeline_past_clients: 'visible',
};

export function usePermissions() {
  const { crmUser } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
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
            overview: data.overview || 'visible',
            tasks: data.tasks || 'visible',
            pipeline: data.pipeline || 'visible',
            contacts: data.contacts || 'visible',
            resources: data.resources || 'visible',
            calculators: data.calculators || 'visible',
            admin: data.admin || 'hidden',
            pipeline_leads: data.pipeline_leads || 'visible',
            pipeline_pending_app: data.pipeline_pending_app || 'visible',
            pipeline_screening: data.pipeline_screening || 'visible',
            pipeline_pre_qualified: data.pipeline_pre_qualified || 'visible',
            pipeline_pre_approved: data.pipeline_pre_approved || 'visible',
            pipeline_active: data.pipeline_active || 'visible',
            pipeline_past_clients: data.pipeline_past_clients || 'visible',
          });
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions(DEFAULT_PERMISSIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [crmUser?.id, crmUser?.role]);

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
