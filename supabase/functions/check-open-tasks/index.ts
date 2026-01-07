import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Target pipeline stages for the check
const TARGET_STAGE_IDS = [
  "c54f417b-3f67-43de-80f5-954cf260d571", // Leads
  "44d74bfb-c4f3-4f7d-a69e-e47ac67a5945", // Pending App
  "a4e162e0-5421-4d17-8ad5-4b1195bbc995", // Screening
  "09162eec-d2b2-48e5-86d0-9e66ee8b2af7", // Pre-Qualified
  "3cbf38ff-752e-4163-a9a3-1757499b4945", // Pre-Approved
  "76eb2e82-e1d9-4f2d-a57d-2120a25696db", // Active
];

const YOUSIF_MOHAMED_ID = "230ccf6d-48f5-4f3c-89fd-f2907ebdba1e";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting check-open-tasks function...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all leads in target pipeline stages that are not deleted
    console.log("Fetching leads in target pipeline stages...");
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, first_name, last_name")
      .in("pipeline_stage_id", TARGET_STAGE_IDS)
      .is("deleted_at", null);

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      console.log("No leads found in target pipeline stages");
      return new Response(
        JSON.stringify({ message: "No leads found in target stages", tasksCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${leads.length} leads in target pipeline stages`);
    const leadIds = leads.map((l) => l.id);

    // Get all open tasks for these leads
    // Open task = status is "To Do" or "Working on it" and not deleted
    console.log("Fetching open tasks for these leads...");
    const { data: openTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("borrower_id")
      .in("borrower_id", leadIds)
      .in("status", ["To Do", "Working on it"])
      .is("deleted_at", null);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Find leads that have open tasks
    const leadsWithOpenTasks = new Set(openTasks?.map((t) => t.borrower_id) || []);
    console.log(`Found ${leadsWithOpenTasks.size} leads with open tasks`);

    // Find leads without open tasks
    const leadsWithoutTasks = leads.filter((l) => !leadsWithOpenTasks.has(l.id));
    console.log(`Found ${leadsWithoutTasks.length} leads WITHOUT open tasks`);

    if (leadsWithoutTasks.length === 0) {
      console.log("All leads have open tasks, no tasks to create");
      return new Response(
        JSON.stringify({ message: "All leads have open tasks", tasksCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Create "No open task found" task for each lead without open tasks
    const tasksToCreate = leadsWithoutTasks.map((lead) => ({
      title: "No open task found",
      borrower_id: lead.id,
      assignee_id: YOUSIF_MOHAMED_ID,
      due_date: today,
      status: "To Do",
      priority: "High",
      creation_log: `Auto-created: No open tasks found for ${lead.first_name} ${lead.last_name}`,
    }));

    console.log(`Creating ${tasksToCreate.length} tasks...`);
    const { data: createdTasks, error: createError } = await supabase
      .from("tasks")
      .insert(tasksToCreate)
      .select("id, title, borrower_id");

    if (createError) {
      console.error("Error creating tasks:", createError);
      throw createError;
    }

    console.log(`Successfully created ${createdTasks?.length || 0} tasks`);

    // Log details of created tasks
    for (const task of createdTasks || []) {
      const lead = leadsWithoutTasks.find((l) => l.id === task.borrower_id);
      console.log(`Created task for: ${lead?.first_name} ${lead?.last_name} (Lead ID: ${task.borrower_id})`);
    }

    return new Response(
      JSON.stringify({
        message: "Tasks created successfully",
        tasksCreated: createdTasks?.length || 0,
        leads: leadsWithoutTasks.map((l) => ({
          id: l.id,
          name: `${l.first_name} ${l.last_name}`,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-open-tasks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
