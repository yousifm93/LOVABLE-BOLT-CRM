import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/contexts/FieldsContext";

export const useFieldManagement = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_fields')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      toast({ 
        title: "Error", 
        description: "Failed to load fields", 
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }
    
    setFields(data as unknown as Field[]);
    setLoading(false);
  };

  const addField = async (fieldData: any) => {
    // Validation: check if field_name already exists
    const exists = fields.find(f => f.field_name === fieldData.field_name);
    if (exists) {
      toast({ 
        title: "Duplicate Field", 
        description: `Field "${fieldData.field_name}" already exists.`,
        variant: "destructive" 
      });
      return false;
    }

    const { data, error } = await supabase
      .from('crm_fields')
      .insert([fieldData])
      .select()
      .single();
    
    if (error) {
      toast({ 
        title: "Error", 
        description: "Failed to add field", 
        variant: "destructive" 
      });
      return false;
    }
    
    toast({ 
      title: "Success", 
      description: `Field "${fieldData.display_name}" added successfully` 
    });
    await loadFields();
    return true;
  };

  const updateField = async (fieldId: string, updates: Partial<Field>) => {
    const { error } = await supabase
      .from('crm_fields')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', fieldId);
    
    if (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update field", 
        variant: "destructive" 
      });
      return false;
    }
    
    toast({ title: "Success", description: "Field updated successfully" });
    await loadFields();
    return true;
  };

  const deleteField = async (fieldId: string) => {
    // Check if field is in use
    const field = fields.find(f => f.id === fieldId);
    
    if (field?.is_system_field) {
      toast({ 
        title: "Cannot Delete", 
        description: "System fields cannot be deleted",
        variant: "destructive" 
      });
      return false;
    }

    // Soft delete: mark as not in use
    const { error } = await supabase
      .from('crm_fields')
      .update({ is_in_use: false, is_visible: false })
      .eq('id', fieldId);
    
    if (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete field", 
        variant: "destructive" 
      });
      return false;
    }
    
    toast({ title: "Success", description: "Field deleted successfully" });
    await loadFields();
    return true;
  };

  useEffect(() => {
    loadFields();
  }, []);

  return { 
    fields, 
    conflicts, 
    loading,
    loadFields, 
    addField, 
    updateField, 
    deleteField 
  };
};
