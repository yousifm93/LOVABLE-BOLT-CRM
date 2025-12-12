import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EmailAutomation {
  id: string;
  name: string;
  recipient_type: string;
  template_id: string | null;
  trigger_config: any;
}

interface UseEmailAutomationCheckReturn {
  checkForAutomations: (fieldName: string, newValue: string) => Promise<EmailAutomation[]>;
  matchingAutomations: EmailAutomation[];
  queueEmailAutomation: (leadId: string, fieldName: string, oldValue: string | null, newValue: string) => Promise<void>;
  triggerEmailAutomation: (leadId: string, fieldName: string, fieldValue: string) => Promise<void>;
}

export function useEmailAutomationCheck(): UseEmailAutomationCheckReturn {
  const [matchingAutomations, setMatchingAutomations] = useState<EmailAutomation[]>([]);
  const { user } = useAuth();

  const checkForAutomations = useCallback(async (fieldName: string, newValue: string): Promise<EmailAutomation[]> => {
    try {
      // Fetch active email automations with status_changed trigger
      const { data: automations, error } = await supabase
        .from('email_automations')
        .select('id, name, recipient_type, template_id, trigger_config')
        .eq('is_active', true)
        .eq('trigger_type', 'status_changed');

      if (error) {
        console.error('Error checking email automations:', error);
        return [];
      }

      // Filter to find matching automations
      const matching = (automations || []).filter((automation) => {
        const config = automation.trigger_config as Record<string, unknown> || {};
        return config.field === fieldName && config.target_status === newValue;
      });

      setMatchingAutomations(matching);
      return matching;
    } catch (err) {
      console.error('Error in checkForAutomations:', err);
      return [];
    }
  }, []);

  const queueEmailAutomation = useCallback(async (
    leadId: string, 
    fieldName: string, 
    oldValue: string | null, 
    newValue: string
  ) => {
    try {
      // Get matching automations
      const matching = await checkForAutomations(fieldName, newValue);
      
      if (matching.length === 0) return;

      // Queue each matching automation
      for (const automation of matching) {
        const { error } = await supabase
          .from('email_automation_queue')
          .insert({
            automation_id: automation.id,
            lead_id: leadId,
            field_name: fieldName,
            old_value: oldValue,
            new_value: newValue,
            status: 'pending',
            triggered_by: user?.id || null,
            triggered_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error queueing email automation:', error);
        }
      }
    } catch (err) {
      console.error('Error in queueEmailAutomation:', err);
    }
  }, [checkForAutomations, user]);

  const triggerEmailAutomation = useCallback(async (leadId: string, fieldName: string, fieldValue: string) => {
    try {
      const { error } = await supabase.functions.invoke('trigger-email-automation', {
        body: {
          triggerType: 'status_changed',
          fieldName,
          fieldValue,
          leadId,
        },
      });

      if (error) {
        console.error('Error triggering email automation:', error);
      }
    } catch (err) {
      console.error('Error invoking trigger-email-automation:', err);
    }
  }, []);

  return {
    checkForAutomations,
    matchingAutomations,
    queueEmailAutomation,
    triggerEmailAutomation,
  };
}
