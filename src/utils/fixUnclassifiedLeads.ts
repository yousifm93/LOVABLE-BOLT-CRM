import { supabase } from "@/integrations/supabase/client";

/**
 * One-time utility to fix leads with NULL pipeline_stage_id
 * This assigns them to the "Leads" pipeline stage
 */
export async function fixUnclassifiedLeads() {
  try {
    // Get the "Leads" pipeline stage ID
    const { data: leadsStage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('name', 'Leads')
      .single();

    if (stageError) {
      console.error('Error fetching Leads stage:', stageError);
      return { success: false, error: stageError };
    }

    if (!leadsStage?.id) {
      console.error('Leads stage not found');
      return { success: false, error: 'Leads stage not found' };
    }

    // Update all leads with NULL pipeline_stage_id
    const { data, error } = await supabase
      .from('leads')
      .update({ pipeline_stage_id: leadsStage.id })
      .is('pipeline_stage_id', null)
      .select('id');

    if (error) {
      console.error('Error updating leads:', error);
      return { success: false, error };
    }

    console.log(`Successfully updated ${data?.length || 0} leads to "Leads" pipeline stage`);
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}
