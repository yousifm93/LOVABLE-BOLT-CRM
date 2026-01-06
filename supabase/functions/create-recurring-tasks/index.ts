import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-recurring-tasks: Starting daily recurring task creation');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Salman Mohamed's user ID
    const SALMAN_USER_ID = '159376ae-30e9-4997-b61f-76ab8d7f224b';

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Define the recurring tasks
    const recurringTasks = [
      {
        title: 'Sales Calls',
        description: 'Make All Your Sales Calls and Update in the Dashboard',
        assignee_id: SALMAN_USER_ID,
        priority: 'High',
        status: 'Working on it',
        due_date: todayStr,
      },
      {
        title: 'Sales Activities',
        description: 'Perform our sales activities and update the dashboard',
        assignee_id: SALMAN_USER_ID,
        priority: 'High',
        status: 'Working on it',
        due_date: todayStr,
      }
    ];

    const createdTasks: string[] = [];

    for (const task of recurringTasks) {
      // Check if a task with the same title already exists for today
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('title', task.title)
        .eq('due_date', todayStr)
        .eq('assignee_id', SALMAN_USER_ID)
        .maybeSingle();

      if (existingTask) {
        console.log(`Task "${task.title}" already exists for today, skipping`);
        continue;
      }

      // Create the task
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          assignee_ids: [SALMAN_USER_ID],
          task_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Error creating task "${task.title}":`, error);
        continue;
      }

      console.log(`Created task "${task.title}" with ID: ${newTask.id}`);
      createdTasks.push(newTask.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdTasks.length} recurring tasks for ${todayStr}`,
        task_ids: createdTasks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-recurring-tasks:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
