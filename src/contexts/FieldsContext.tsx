import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Field {
  id: string;
  field_name: string;
  display_name: string;
  description?: string | null;
  section: string;
  field_type: string;
  is_required: boolean;
  is_visible: boolean;
  is_system_field: boolean;
  is_in_use: boolean;
  sort_order: number;
  sample_data?: string | null;
  dropdown_options?: string[];
  file_config?: {
    storage_path: string;
    allowed_types: string[];
  };
  validation_rules?: any;
}

interface FieldsContextType {
  allFields: Field[];
  getFieldsBySection: (section: string) => Field[];
  getFieldConfig: (fieldName: string) => Field | undefined;
  reloadFields: () => Promise<void>;
  loading: boolean;
}

const FieldsContext = createContext<FieldsContextType | undefined>(undefined);

export function FieldsProvider({ children }: { children: ReactNode }) {
  const [allFields, setAllFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_fields')
      .select('*')
      .eq('is_in_use', true)
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('[FieldsContext] Error loading fields:', error);
    }
    
    // Always set data (even if empty) so UI can show proper state
    setAllFields((data as unknown as Field[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFields();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('crm_fields_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'crm_fields' },
        () => { loadFields(); }
      )
      .subscribe();

    // Reload fields when auth state changes (e.g., session becomes available)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[FieldsContext] Auth state changed, reloading fields');
        loadFields();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      authSubscription.unsubscribe();
    };
  }, []);

  const getFieldsBySection = (section: string) => {
    return allFields.filter(f => f.section === section);
  };

  const getFieldConfig = (fieldName: string) => {
    return allFields.find(f => f.field_name === fieldName);
  };

  return (
    <FieldsContext.Provider value={{ 
      allFields, 
      getFieldsBySection, 
      getFieldConfig,
      reloadFields: loadFields,
      loading
    }}>
      {children}
    </FieldsContext.Provider>
  );
}

export const useFields = () => {
  const context = useContext(FieldsContext);
  if (!context) throw new Error('useFields must be used within FieldsProvider');
  return context;
};
