import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Field {
  id: string;
  field_name: string;
  display_name: string;
  section: string;
  field_type: string;
  is_required: boolean;
  is_visible: boolean;
  is_system_field: boolean;
  is_in_use: boolean;
  sort_order: number;
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
    
    if (!error && data) {
      setAllFields(data as unknown as Field[]);
    }
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

    return () => {
      supabase.removeChannel(channel);
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
