import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch counts of borrower documents pending review for a list of lead IDs.
 * Returns a map of leadId -> count of documents with 'pending_review' status.
 */
export function useDocumentReviewCounts(leadIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (leadIds.length === 0) {
      setCounts({});
      return;
    }

    try {
      setLoading(true);
      
      // Get all borrower_tasks for these leads to get task IDs
      const { data: tasks, error: tasksError } = await supabase
        .from('borrower_tasks')
        .select('id, lead_id')
        .in('lead_id', leadIds);
      
      if (tasksError) {
        console.error('Error fetching borrower tasks:', tasksError);
        return;
      }
      
      if (!tasks || tasks.length === 0) {
        setCounts({});
        return;
      }
      
      // Create a map of taskId -> leadId
      const taskToLead: Record<string, string> = {};
      tasks.forEach(t => {
        if (t.lead_id) taskToLead[t.id] = t.lead_id;
      });
      
      const taskIds = tasks.map(t => t.id);
      
      // Get documents pending review (check multiple status variants)
      const { data: docs, error: docsError } = await supabase
        .from('borrower_documents')
        .select('task_id')
        .in('task_id', taskIds)
        .in('status', ['pending_review', 'in_review', 'in review']);
      
      if (docsError) {
        console.error('Error fetching borrower documents:', docsError);
        return;
      }
      
      // Count documents per lead
      const countMap: Record<string, number> = {};
      docs?.forEach(doc => {
        if (doc.task_id) {
          const leadId = taskToLead[doc.task_id];
          if (leadId) {
            countMap[leadId] = (countMap[leadId] || 0) + 1;
          }
        }
      });
      
      setCounts(countMap);
    } catch (error) {
      console.error('Error fetching document review counts:', error);
    } finally {
      setLoading(false);
    }
  }, [leadIds.join(',')]); // Use joined string as dependency to avoid object comparison issues

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading, refetch: fetchCounts };
}
