import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailFieldSuggestion {
  id: string;
  email_log_id: string;
  lead_id: string;
  field_name: string;
  field_display_name: string;
  current_value: string | null;
  suggested_value: string;
  reason: string;
  confidence: number;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  lead?: {
    first_name: string;
    last_name: string;
  };
  email_log?: {
    subject: string;
    from_email: string;
  };
}

export function useEmailSuggestions() {
  const [suggestions, setSuggestions] = useState<EmailFieldSuggestion[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestions = useCallback(async (status?: 'pending' | 'approved' | 'denied') => {
    try {
      let query = supabase
        .from('email_field_suggestions')
        .select(`
          *,
          lead:leads(first_name, last_name),
          email_log:email_logs(subject, from_email)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }

      return (data || []) as EmailFieldSuggestion[];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('email_field_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [allSuggestions, count] = await Promise.all([
      fetchSuggestions('pending'),
      fetchPendingCount(),
    ]);
    setSuggestions(allSuggestions);
    setPendingCount(count);
    setIsLoading(false);
  }, [fetchSuggestions, fetchPendingCount]);

  const approveSuggestion = useCallback(async (suggestion: EmailFieldSuggestion) => {
    try {
      // Update the lead field
      const { error: updateError } = await supabase
        .from('leads')
        .update({ [suggestion.field_name]: suggestion.suggested_value })
        .eq('id', suggestion.lead_id);

      if (updateError) {
        toast.error('Failed to update lead field');
        console.error('Error updating lead:', updateError);
        return false;
      }

      // Mark suggestion as approved
      const { error: suggestionError } = await supabase
        .from('email_field_suggestions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id);

      if (suggestionError) {
        console.error('Error updating suggestion:', suggestionError);
        return false;
      }

      toast.success(`Updated ${suggestion.field_display_name} to ${suggestion.suggested_value}`);
      await loadData();
      return true;
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('Failed to approve suggestion');
      return false;
    }
  }, [loadData]);

  const denySuggestion = useCallback(async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('email_field_suggestions')
        .update({
          status: 'denied',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error denying suggestion:', error);
        toast.error('Failed to deny suggestion');
        return false;
      }

      toast.success('Suggestion denied');
      await loadData();
      return true;
    } catch (error) {
      console.error('Error denying suggestion:', error);
      toast.error('Failed to deny suggestion');
      return false;
    }
  }, [loadData]);

  const getSuggestionsForEmail = useCallback(async (emailLogId: string) => {
    try {
      const { data, error } = await supabase
        .from('email_field_suggestions')
        .select('*')
        .eq('email_log_id', emailLogId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching suggestions for email:', error);
        return [];
      }

      return (data || []) as EmailFieldSuggestion[];
    } catch (error) {
      console.error('Error fetching suggestions for email:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    suggestions,
    pendingCount,
    isLoading,
    fetchSuggestions,
    fetchPendingCount,
    approveSuggestion,
    denySuggestion,
    getSuggestionsForEmail,
    refreshSuggestions: loadData,
  };
}
