import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      if (suggestion.is_new_lender && suggestion.suggested_lender_name) {
        // First check if lender already exists (case-insensitive)
        const { data: existingLender } = await supabase
          .from('lenders')
          .select('id')
          .ilike('lender_name', suggestion.suggested_lender_name)
          .maybeSingle();

        if (existingLender) {
          // Lender exists - update the field on existing lender
          const updateData: Record<string, string> = {
            [suggestion.field_name]: suggestion.suggested_value,
          };

          const { error: updateError } = await supabase
            .from('lenders')
            .update(updateData)
            .eq('id', existingLender.id);

          if (updateError) {
            toast.error('Failed to update existing lender field');
            console.error('Error updating lender:', updateError);
            return false;
          }

          toast.success(`Updated ${suggestion.field_name} on ${suggestion.suggested_lender_name}`);
        } else {
          // Lender doesn't exist - create new with the field value
          const { error: insertError } = await supabase
            .from('lenders')
            .insert({
              lender_name: suggestion.suggested_lender_name,
              status: 'Pending',
              [suggestion.field_name]: suggestion.suggested_value,
            });

          if (insertError) {
            toast.error('Failed to create new lender');
            console.error('Error creating lender:', insertError);
            return false;
          }

          toast.success(`Created new lender: ${suggestion.suggested_lender_name}`);
        }
      } else if (suggestion.lender_id) {
        // Update existing lender field
        const updateData: Record<string, string> = {
          [suggestion.field_name]: suggestion.suggested_value,
        };

        const { error: updateError } = await supabase
          .from('lenders')
          .update(updateData)
          .eq('id', suggestion.lender_id);

        if (updateError) {
          toast.error('Failed to update lender field');
          console.error('Error updating lender:', updateError);
          return false;
        }

        toast.success(`Updated ${suggestion.field_name} to ${suggestion.suggested_value}`);
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
