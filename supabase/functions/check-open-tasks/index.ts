import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Target pipeline stages for the check
const TARGET_STAGE_IDS = [
  "c54f417b-3f67-43de-80f5-954cf260d571", // Leads
  "44d74bfb-c4f3-4f7d-a69e-e47ac67a5945", // Pending App
  "a4e162e0-5421-4d17-8ad5-4b1195bbc995", // Screening
  "09162eec-d2b2-48e5-86d0-9e66ee8b2ad7", // Pre-Qualified
  "3cbf38ff-752e-4163-a9a3-1757499b4945", // Pre-Approved
  "76eb2e82-e1d9-4f2d-a57d-2120a25696db", // Active
];

// Default fallback user
const DEFAULT_ASSIGNEE_ID = "230ccf6d-48f5-4f3c-89fd-f2907ebdba1e"; // Yousif Mohamed

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

    // Parse request body for optional leadId (single-lead mode)
    const { leadId } = await req.json().catch(() => ({}));

    // SINGLE-LEAD MODE: Check a specific lead after task completion
    if (leadId) {
      console.log(`Single-lead mode: Checking lead ${leadId}`);

      // 1. Verify lead exists and is in target pipeline stages
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id, first_name, last_name, pipeline_stage_id")
        .eq("id", leadId)
        .is("deleted_at", null)
        .single();

      if (leadError || !lead) {
        console.log("Lead not found or deleted:", leadId);
        return new Response(
          JSON.stringify({ message: "Lead not found", tasksCreated: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!TARGET_STAGE_IDS.includes(lead.pipeline_stage_id)) {
        console.log(`Lead ${leadId} not in target stages (current: ${lead.pipeline_stage_id})`);
        return new Response(
          JSON.stringify({ message: "Lead not in target pipeline stages", tasksCreated: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Check if lead has any open tasks
      const { data: openTasks, error: openTasksError } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("borrower_id", leadId)
        .in("status", ["To Do", "Working on it"])
        .is("deleted_at", null);

      if (openTasksError) {
        console.error("Error fetching open tasks:", openTasksError);
        throw openTasksError;
      }

      if (openTasks && openTasks.length > 0) {
        console.log(`Lead ${leadId} has ${openTasks.length} open tasks, no placeholder needed`);
        return new Response(
          JSON.stringify({ message: "Lead has open tasks", tasksCreated: 0, openTaskCount: openTasks.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Check for existing "No open task found" task to prevent duplicates
      const { data: existingPlaceholder, error: placeholderError } = await supabase
        .from("tasks")
        .select("id")
        .eq("borrower_id", leadId)
        .eq("title", "No open task found")
        .in("status", ["To Do", "Working on it"])
        .is("deleted_at", null)
        .limit(1);

      if (placeholderError) {
        console.error("Error checking for existing placeholder:", placeholderError);
        throw placeholderError;
      }

      if (existingPlaceholder && existingPlaceholder.length > 0) {
        console.log(`Lead ${leadId} already has an open "No open task found" task`);
        return new Response(
          JSON.stringify({ message: "Placeholder task already exists", tasksCreated: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Find the last assignee from most recent task
      const { data: recentTask, error: recentTaskError } = await supabase
        .from("tasks")
        .select("assignee_id")
        .eq("borrower_id", leadId)
        .is("deleted_at", null)
        .not("assignee_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      const assigneeId = recentTask?.assignee_id || DEFAULT_ASSIGNEE_ID;
      console.log(`Using assignee: ${assigneeId} (from recent task: ${!!recentTask?.assignee_id})`);

      // 5. Create the placeholder task
      const today = new Date().toISOString().split("T")[0];
      const { data: createdTask, error: createError } = await supabase
        .from("tasks")
        .insert({
          title: "No open task found",
          borrower_id: leadId,
          assignee_id: assigneeId,
          due_date: today,
          status: "To Do",
          priority: "High",
          creation_log: `Auto-created: No open tasks found for ${lead.first_name} ${lead.last_name}.`,
        })
        .select("id, title")
        .single();

      if (createError) {
        console.error("Error creating placeholder task:", createError);
        throw createError;
      }

      console.log(`Created "No open task found" task for ${lead.first_name} ${lead.last_name}`);

      return new Response(
        JSON.stringify({
          message: "Placeholder task created",
          tasksCreated: 1,
          lead: { id: lead.id, name: `${lead.first_name} ${lead.last_name}` },
          task: createdTask,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BATCH MODE: Check all leads in target stages (existing behavior)
    console.log("Batch mode: Checking all leads in target pipeline stages...");

    // Get all leads in target pipeline stages that are not deleted
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
      .select("borrower_id, title")
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

    // Find leads that already have an open "No open task found" task
    const leadsWithPlaceholder = new Set(
      openTasks?.filter((t) => t.title === "No open task found").map((t) => t.borrower_id) || []
    );
    console.log(`Found ${leadsWithPlaceholder.size} leads with existing placeholder tasks`);

    // Find leads without open tasks AND without existing placeholder
    const leadsWithoutTasks = leads.filter(
      (l) => !leadsWithOpenTasks.has(l.id) && !leadsWithPlaceholder.has(l.id)
    );
    console.log(`Found ${leadsWithoutTasks.length} leads WITHOUT open tasks (excluding those with placeholder)`);

    if (leadsWithoutTasks.length === 0) {
      console.log("All leads have open tasks or placeholder tasks, nothing to create");
      return new Response(
        JSON.stringify({ message: "All leads accounted for", tasksCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each lead without tasks, find the last assignee from their most recent task
    const leadIdsWithoutTasks = leadsWithoutTasks.map((l) => l.id);
    console.log("Fetching last task assignees for leads without tasks...");
    
    const { data: recentTasks, error: recentTasksError } = await supabase
      .from("tasks")
      .select("borrower_id, assignee_id, updated_at")
      .in("borrower_id", leadIdsWithoutTasks)
      .is("deleted_at", null)
      .not("assignee_id", "is", null)
      .order("updated_at", { ascending: false });

    if (recentTasksError) {
      console.error("Error fetching recent tasks:", recentTasksError);
      // Continue with default assignee if this fails
    }

    // Build a map of lead_id -> last_assignee_id (first occurrence is most recent)
    const lastAssigneeMap: Record<string, string> = {};
    for (const task of recentTasks || []) {
      if (!lastAssigneeMap[task.borrower_id] && task.assignee_id) {
        lastAssigneeMap[task.borrower_id] = task.assignee_id;
      }
    }

    console.log(`Found last assignees for ${Object.keys(lastAssigneeMap).length} leads`);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Create "No open task found" task for each lead without open tasks
    const tasksToCreate = leadsWithoutTasks.map((lead) => ({
      title: "No open task found",
      borrower_id: lead.id,
      // Use the last task's assignee if available, otherwise use default
      assignee_id: lastAssigneeMap[lead.id] || DEFAULT_ASSIGNEE_ID,
      due_date: today,
      status: "To Do",
      priority: "High",
      creation_log: `Auto-created: No open tasks found for ${lead.first_name} ${lead.last_name}. Assigned to ${lastAssigneeMap[lead.id] ? 'last task assignee' : 'default user'}.`,
    }));

    console.log(`Creating ${tasksToCreate.length} tasks...`);
    const { data: createdTasks, error: createError } = await supabase
      .from("tasks")
      .insert(tasksToCreate)
      .select("id, title, borrower_id, assignee_id");

    if (createError) {
      console.error("Error creating tasks:", createError);
      throw createError;
    }

    console.log(`Successfully created ${createdTasks?.length || 0} tasks`);

    // Log details of created tasks
    for (const task of createdTasks || []) {
      const lead = leadsWithoutTasks.find((l) => l.id === task.borrower_id);
      console.log(`Created task for: ${lead?.first_name} ${lead?.last_name} (Lead ID: ${task.borrower_id}, Assignee: ${task.assignee_id})`);
    }

    return new Response(
      JSON.stringify({
        message: "Tasks created successfully",
        tasksCreated: createdTasks?.length || 0,
        leads: leadsWithoutTasks.map((l) => ({
          id: l.id,
          name: `${l.first_name} ${l.last_name}`,
          assignedTo: lastAssigneeMap[l.id] || DEFAULT_ASSIGNEE_ID,
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
