import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { automationId } = await req.json();

    if (!automationId) {
      throw new Error('Automation ID is required');
    }

    // Get the automation details
    const { data: automation, error: fetchError } = await supabaseClient
      .from('task_automations')
      .select('*')
      .eq('id', automationId)
      .single();

    if (fetchError || !automation) {
      throw new Error('Automation not found');
    }

    // Create the task immediately (manual trigger)
    const { data: newTask, error: taskError } = await supabaseClient
      .from('tasks')
      .insert({
        title: automation.task_name,
        description: automation.task_description,
        borrower_id: null, // NBT for scheduled tasks
        assignee_id: automation.assigned_to_user_id,
        priority: automation.task_priority,
        due_date: new Date(Date.now() + (automation.due_date_offset_days || 0) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Working on it',
        created_by: automation.created_by,
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    // Log the manual execution
    await supabaseClient
      .from('task_automation_executions')
      .insert({
        automation_id: automationId,
        lead_id: null,
        task_id: newTask.id,
        executed_at: new Date().toISOString(),
        success: true,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        task: newTask,
        message: 'Task created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error triggering automation:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
