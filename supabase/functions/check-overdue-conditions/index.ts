import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASHLEY_USER_ID = "3dca68fc-ee7e-46cc-91a1-0c6176d4c32a";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    console.log(`[check-overdue-conditions] Running for date: ${today}`);

    // Get all conditions that are past due in "Added" or "Requested" status
    const { data: overdueConditions, error: conditionsError } = await supabase
      .from("lead_conditions")
      .select(`
        id,
        lead_id,
        description,
        due_date,
        status,
        leads:lead_id (
          id,
          first_name,
          last_name
        )
      `)
      .in("status", ["1_added", "2_requested"])
      .lt("due_date", today)
      .not("due_date", "is", null);

    if (conditionsError) {
      console.error("Error fetching overdue conditions:", conditionsError);
      throw conditionsError;
    }

    console.log(`[check-overdue-conditions] Found ${overdueConditions?.length || 0} overdue conditions`);

    if (!overdueConditions || overdueConditions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No overdue conditions found",
          tasksCreated: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group conditions by lead_id
    const conditionsByLead = new Map<string, typeof overdueConditions>();
    for (const condition of overdueConditions) {
      if (!condition.lead_id) continue;
      
      const existing = conditionsByLead.get(condition.lead_id) || [];
      existing.push(condition);
      conditionsByLead.set(condition.lead_id, existing);
    }

    console.log(`[check-overdue-conditions] Grouped into ${conditionsByLead.size} leads`);

    const createdTaskIds: string[] = [];
    const skippedLeads: string[] = [];

    // For each lead, check if task already exists for today and create if not
    for (const [leadId, conditions] of conditionsByLead) {
      // Check if a task with this title already exists for this lead today
      const { data: existingTasks, error: taskCheckError } = await supabase
        .from("tasks")
        .select("id")
        .eq("borrower_id", leadId)
        .eq("title", "Conditions past due - please update ETAs")
        .eq("due_date", today)
        .limit(1);

      if (taskCheckError) {
        console.error(`Error checking existing tasks for lead ${leadId}:`, taskCheckError);
        continue;
      }

      if (existingTasks && existingTasks.length > 0) {
        console.log(`[check-overdue-conditions] Task already exists for lead ${leadId}, skipping`);
        skippedLeads.push(leadId);
        continue;
      }

      // Build description with list of overdue conditions
      const conditionDescriptions = conditions.map((c) => {
        const dueDate = c.due_date ? new Date(c.due_date).toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric" 
        }) : "No ETA";
        return `${c.description} (ETA: ${dueDate})`;
      });

      const description = conditionDescriptions.join(", ");

      // Get borrower name for logging
      const lead = conditions[0]?.leads as { first_name?: string; last_name?: string } | null;
      const borrowerName = lead ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() : "Unknown";

      // Create the task
      const { data: newTask, error: createError } = await supabase
        .from("tasks")
        .insert({
          title: "Conditions past due - please update ETAs",
          description: description,
          borrower_id: leadId,
          assignee_id: ASHLEY_USER_ID,
          priority: "High",
          status: "Working on it",
          due_date: today,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) {
        console.error(`Error creating task for lead ${leadId}:`, createError);
        continue;
      }

      console.log(`[check-overdue-conditions] Created task ${newTask.id} for ${borrowerName} with ${conditions.length} overdue conditions`);
      createdTaskIds.push(newTask.id);
    }

    const message = `Created ${createdTaskIds.length} tasks, skipped ${skippedLeads.length} leads (tasks already exist)`;
    console.log(`[check-overdue-conditions] Complete: ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        tasksCreated: createdTaskIds.length,
        taskIds: createdTaskIds,
        skippedLeads: skippedLeads.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-overdue-conditions] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
