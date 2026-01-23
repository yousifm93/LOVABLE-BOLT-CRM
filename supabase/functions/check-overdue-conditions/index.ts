import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback user ID (Herman) if no teammate_assigned on the lead
const DEFAULT_FALLBACK_USER_ID = "fa92a4c6-890d-4d69-99a8-c3adc6c904ee";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    console.log(`Checking for overdue conditions as of ${today}`);

    // Fetch all overdue conditions (status is 1_added or 2_requested, due_date < today)
    // Join with leads to get teammate_assigned
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
          last_name,
          teammate_assigned
        )
      `)
      .in("status", ["1_added", "2_requested"])
      .lt("due_date", today)
      .not("due_date", "is", null);

    if (conditionsError) {
      console.error("Error fetching overdue conditions:", conditionsError);
      throw conditionsError;
    }

    console.log(`Found ${overdueConditions?.length || 0} overdue conditions`);

    if (!overdueConditions || overdueConditions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No overdue conditions found",
          tasksCreated: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group conditions by lead_id
    const conditionsByLead: Record<string, typeof overdueConditions> = {};
    for (const condition of overdueConditions) {
      if (!condition.lead_id) continue;
      if (!conditionsByLead[condition.lead_id]) {
        conditionsByLead[condition.lead_id] = [];
      }
      conditionsByLead[condition.lead_id].push(condition);
    }

    let tasksCreated = 0;
    let leadsSkipped = 0;

    // For each lead with overdue conditions, create a task if one doesn't exist for today
    for (const [leadId, conditions] of Object.entries(conditionsByLead)) {
      // Check if a task already exists for this lead today with this title
      const { data: existingTasks, error: taskCheckError } = await supabase
        .from("tasks")
        .select("id")
        .eq("borrower_id", leadId)
        .eq("title", "Conditions past due - please update ETAs")
        .eq("due_date", today);

      if (taskCheckError) {
        console.error(`Error checking existing tasks for lead ${leadId}:`, taskCheckError);
        continue;
      }

      if (existingTasks && existingTasks.length > 0) {
        console.log(`Task already exists for lead ${leadId} today, skipping`);
        leadsSkipped++;
        continue;
      }

      // Get the lead info for teammate_assigned
      const lead = conditions[0]?.leads as { id: string; first_name: string; last_name: string; teammate_assigned: string | null } | null;
      
      // Use the lead's teammate_assigned, or fallback to Herman
      const assigneeId = lead?.teammate_assigned || DEFAULT_FALLBACK_USER_ID;

      // Build description with list of overdue conditions
      const conditionDescriptions = conditions.map((c) => {
        const dueDate = c.due_date
          ? new Date(c.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "No date";
        return `${c.description} (ETA: ${dueDate})`;
      });
      const description = conditionDescriptions.join(", ");

      // Create the task
      const { error: insertError } = await supabase
        .from("tasks")
        .insert({
          title: "Conditions past due - please update ETAs",
          description: description,
          borrower_id: leadId,
          assignee_id: assigneeId,
          priority: "High",
          status: "Working on it",
          due_date: today,
        });

      if (insertError) {
        console.error(`Error creating task for lead ${leadId}:`, insertError);
        continue;
      }

      console.log(`Created task for lead ${leadId} with ${conditions.length} overdue conditions, assigned to ${assigneeId}`);
      tasksCreated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${tasksCreated} tasks for overdue conditions`,
        tasksCreated,
        leadsSkipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-overdue-conditions:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
