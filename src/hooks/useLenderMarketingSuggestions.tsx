import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
// Field alias map: extracted key -> actual DB column
const FIELD_ALIASES: Record<string, string> = {
  product_dscr: 'product_fthb_dscr',
  product_bank_statement: 'product_bs_loan',
  product_p_l: 'product_pl_program',
  product_1099: 'product_1099_program',
  product_foreign_national: 'product_fn',
};

// Numeric fields that need value coercion
const NUMERIC_FIELDS = [
  'max_ltv', 'dscr_max_ltv', 'bs_loan_max_ltv', 'fn_max_ltv', 'heloc_max_ltv',
  'max_loan_amount', 'min_loan_amount', 'heloc_min', 'condotel_min_sqft',
  'min_fico', 'heloc_min_fico', 'asset_dep_months', 'epo_period',
];

// Coerce value to DB-friendly format based on field name
function coerceValue(fieldName: string, value: string): string | number {
  const lowerField = fieldName.toLowerCase();
  
  // Check if this is a numeric field
  const isNumeric = NUMERIC_FIELDS.some(f => lowerField.includes(f) || lowerField === f);
  
  if (isNumeric) {
    // Strip %, $, commas and parse as number
    const cleaned = value.replace(/[%$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  // Return original string for non-numeric or unparseable values
  return value;
}

// Resolve field name using alias map
function resolveFieldName(fieldName: string): string {
  return FIELD_ALIASES[fieldName] || fieldName;
}

export interface LenderFieldSuggestion {
  id: string;
  email_log_id: string;
  lender_id: string | null;
  is_new_lender: boolean;
  suggested_lender_name: string | null;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  confidence: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  processed_at?: string | null;
  processed_by?: string | null;
  lender?: {
    lender_name: string;
  } | null;
  email_log?: {
    subject: string;
    from_email: string;
    body?: string;
    html_body?: string;
    timestamp?: string;
  } | null;
}

export function useLenderMarketingSuggestions() {
  const [suggestions, setSuggestions] = useState<LenderFieldSuggestion[]>([]);
  const [completedSuggestions, setCompletedSuggestions] = useState<LenderFieldSuggestion[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);

  const fetchPendingCount = useCallback(async (hours: number = 24) => {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('lender_field_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', cutoffDate);

      if (error) {
        console.error('Error fetching pending count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }
  }, []);

  const fetchSuggestions = useCallback(async (status: 'pending' | 'approved' | 'denied' = 'pending', hours: number = 24) => {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('lender_field_suggestions')
        .select(`
          *,
          lender:lenders(lender_name),
          email_log:email_logs(subject, from_email, body, html_body, timestamp)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      // Apply time filter for pending suggestions
      if (status === 'pending' && hours < 99999) {
        query = query.gte('created_at', cutoffDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }

      return (data || []) as LenderFieldSuggestion[];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }, []);

  const loadData = useCallback(async (hours: number = 24) => {
    setIsLoading(true);
    const [allSuggestions, count] = await Promise.all([
      fetchSuggestions('pending', hours),
      fetchPendingCount(hours),
    ]);
    setSuggestions(allSuggestions);
    setPendingCount(count);
    setIsLoading(false);
  }, [fetchSuggestions, fetchPendingCount]);

  const fetchCompletedSuggestions = useCallback(async (hours: number = 24) => {
    setIsLoadingCompleted(true);
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('lender_field_suggestions')
        .select(`
          *,
          lender:lenders(lender_name),
          email_log:email_logs(subject, from_email, body, html_body, timestamp)
        `)
        .in('status', ['approved', 'denied'])
        .order('processed_at', { ascending: false });

      if (hours < 99999) {
        query = query.gte('created_at', cutoffDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching completed suggestions:', error);
        setCompletedSuggestions([]);
      } else {
        setCompletedSuggestions((data || []) as LenderFieldSuggestion[]);
      }
    } catch (error) {
      console.error('Error fetching completed suggestions:', error);
      setCompletedSuggestions([]);
    } finally {
      setIsLoadingCompleted(false);
    }
  }, []);

  const approveSuggestion = useCallback(async (suggestion: LenderFieldSuggestion) => {
    try {
      // Resolve field name using alias map
      const resolvedFieldName = resolveFieldName(suggestion.field_name);
      // Coerce value to proper type
      const coercedValue = coerceValue(resolvedFieldName, suggestion.suggested_value);

      if (suggestion.is_new_lender && suggestion.suggested_lender_name) {
        // First check if lender already exists (case-insensitive)
        const { data: existingLender } = await supabase
          .from('lenders')
          .select('id, custom_fields')
          .ilike('lender_name', suggestion.suggested_lender_name)
          .maybeSingle();

        if (existingLender) {
          // Lender exists - update the field on existing lender
          const updateData: Record<string, unknown> = {
            [resolvedFieldName]: coercedValue,
          };

          const { error: updateError } = await supabase
            .from('lenders')
            .update(updateData)
            .eq('id', existingLender.id);

          if (updateError) {
            // Check if it's a column doesn't exist error - fallback to custom_fields
            if (updateError.message?.includes('column') || updateError.code === '42703') {
              const currentCustomFields = (existingLender.custom_fields as Record<string, Json>) || {};
              const mergedFields: Json = { ...currentCustomFields, [suggestion.field_name]: suggestion.suggested_value };
              
              const { error: customError } = await supabase
                .from('lenders')
                .update({ custom_fields: mergedFields })
                .eq('id', existingLender.id);
              
              if (customError) {
                toast.error(`Failed to update: ${customError.message}`);
                console.error('Error updating custom_fields:', customError);
                return false;
              }
              toast.success(`Saved ${suggestion.field_name} to custom fields`);
            } else {
              toast.error(`Failed to update: ${updateError.message}`);
              console.error('Error updating lender:', updateError);
              return false;
            }
          } else {
            toast.success(`Updated ${resolvedFieldName} on ${suggestion.suggested_lender_name}`);
          }
        } else {
          // Lender doesn't exist - create new with the field value
          const insertData: Record<string, unknown> = {
            lender_name: suggestion.suggested_lender_name,
            status: 'Pending',
            [resolvedFieldName]: coercedValue,
          };

          const { error: insertError } = await supabase
            .from('lenders')
            .insert(insertData as any);

          if (insertError) {
            // Check if it's a column doesn't exist error - try without the field, then add to custom_fields
            if (insertError.message?.includes('column') || insertError.code === '42703') {
              const customFieldsData: Json = { [suggestion.field_name]: suggestion.suggested_value };
              const { data: newLender, error: basicInsertError } = await supabase
                .from('lenders')
                .insert({
                  lender_name: suggestion.suggested_lender_name,
                  status: 'Pending',
                  custom_fields: customFieldsData,
                })
                .select('id')
                .single();
              
              if (basicInsertError) {
                toast.error(`Failed to create lender: ${basicInsertError.message}`);
                console.error('Error creating lender:', basicInsertError);
                return false;
              }
              toast.success(`Created ${suggestion.suggested_lender_name} with ${suggestion.field_name} in custom fields`);
            } else {
              toast.error(`Failed to create lender: ${insertError.message}`);
              console.error('Error creating lender:', insertError);
              return false;
            }
          } else {
            toast.success(`Created new lender: ${suggestion.suggested_lender_name}`);
          }
        }
      } else if (suggestion.lender_id) {
        // Update existing lender field
        const updateData: Record<string, unknown> = {
          [resolvedFieldName]: coercedValue,
        };

        const { error: updateError } = await supabase
          .from('lenders')
          .update(updateData)
          .eq('id', suggestion.lender_id);

        if (updateError) {
          // Check if it's a column doesn't exist error - fallback to custom_fields
          if (updateError.message?.includes('column') || updateError.code === '42703') {
            const { data: lenderData } = await supabase
              .from('lenders')
              .select('custom_fields')
              .eq('id', suggestion.lender_id)
              .single();
            
            const currentCustomFields = (lenderData?.custom_fields as Record<string, Json>) || {};
            const mergedFields: Json = { ...currentCustomFields, [suggestion.field_name]: suggestion.suggested_value };
            
            const { error: customError } = await supabase
              .from('lenders')
              .update({ custom_fields: mergedFields })
              .eq('id', suggestion.lender_id);
            
            if (customError) {
              toast.error(`Failed to update: ${customError.message}`);
              console.error('Error updating custom_fields:', customError);
              return false;
            }
            toast.success(`Saved ${suggestion.field_name} to custom fields`);
          } else {
            toast.error(`Failed to update: ${updateError.message}`);
            console.error('Error updating lender:', updateError);
            return false;
          }
        } else {
          toast.success(`Updated ${resolvedFieldName} to ${suggestion.suggested_value}`);
        }
      }

      // Mark suggestion as approved
      const { error: suggestionError } = await supabase
        .from('lender_field_suggestions')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id);

      if (suggestionError) {
        console.error('Error updating suggestion:', suggestionError);
        toast.error('Failed to mark suggestion as approved');
        return false;
      }

      // Optimistic update
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      setPendingCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('Failed to approve suggestion');
      return false;
    }
  }, []);

  const denySuggestion = useCallback(async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('lender_field_suggestions')
        .update({
          status: 'denied',
          processed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error denying suggestion:', error);
        toast.error('Failed to deny suggestion');
        return false;
      }

      toast.success('Suggestion denied');
      // Optimistic update
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      setPendingCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error denying suggestion:', error);
      toast.error('Failed to deny suggestion');
      return false;
    }
  }, []);

  const denyAllForLender = useCallback(async (lenderId: string | null, lenderName: string | null, lenderSuggestions: LenderFieldSuggestion[]) => {
    let successCount = 0;
    let failCount = 0;
    
    for (const suggestion of lenderSuggestions) {
      const success = await denySuggestion(suggestion.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    toast[failCount === 0 ? 'success' : 'error'](
      `${successCount} suggestion${successCount !== 1 ? 's' : ''} denied${failCount > 0 ? `, ${failCount} failed` : ''}`
    );
    
    return failCount === 0;
  }, [denySuggestion]);

  useEffect(() => {
    loadData(24);
  }, [loadData]);

  return {
    suggestions,
    completedSuggestions,
    pendingCount,
    isLoading,
    isLoadingCompleted,
    fetchSuggestions,
    fetchPendingCount,
    fetchCompletedSuggestions,
    approveSuggestion,
    denySuggestion,
    denyAllForLender,
    refreshSuggestions: loadData,
  };
}
