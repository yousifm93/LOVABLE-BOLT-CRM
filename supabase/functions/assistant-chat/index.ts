import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================================================
// TOOL DEFINITIONS - 10 Comprehensive CRM Query Tools
// ============================================================================

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Search and filter leads with access to all 124 CRM fields. Supports filtering by name, date ranges, loan amount, status, stage, assignee, and any custom field.",
      parameters: {
        type: "object",
        properties: {
          search_term: {
            type: "string",
            description: "Search by borrower name (first, last, or full name)"
          },
          filters: {
            type: "object",
            description: "Advanced filters for leads",
            properties: {
              status: { type: "string" },
              pipeline_stage_id: { type: "string", description: "UUID of pipeline stage" },
              created_after: { type: "string", description: "ISO date string (YYYY-MM-DD)" },
              created_before: { type: "string", description: "ISO date string (YYYY-MM-DD)" },
              close_date_after: { type: "string" },
              close_date_before: { type: "string" },
              loan_amount_min: { type: "number" },
              loan_amount_max: { type: "number" },
              loan_type: { type: "string" },
              property_type: { type: "string" },
              teammate_assigned: { type: "string", description: "UUID of assigned user" },
              is_closed: { type: "boolean" }
            }
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Specific fields to return"
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 50, max: 500)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "count_leads",
      description: "Count leads matching specific criteria. Use for 'how many' questions.",
      parameters: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description: "Same filter options as search_leads"
          },
          group_by: {
            type: "string",
            description: "Group counts by field (e.g., 'status', 'pipeline_stage_id', 'loan_type')"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Search contacts (agents, lenders, borrowers, title companies, insurance providers)",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "Search by name, email, phone, or company" },
          type: { type: "string" },
          limit: { type: "number", description: "Max results (default: 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_lead_by_id",
      description: "Get complete details for a specific lead by ID, including ALL 124 fields",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID of the lead" }
        },
        required: ["lead_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_contact_by_id",
      description: "Get complete details for a specific contact by ID",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "UUID of the contact" }
        },
        required: ["contact_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description: "Search and filter tasks",
      parameters: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            properties: {
              status: { type: "string" },
              priority: { type: "string" },
              assignee_id: { type: "string" },
              due_date_after: { type: "string" },
              due_date_before: { type: "string" }
            }
          },
          limit: { type: "number" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_condos",
      description: "Search condo approval database",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "Search by condo name, address, city" },
          approval_type: { type: "string" },
          limit: { type: "number" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_stats",
      description: "Get counts of leads in each pipeline stage",
      parameters: {
        type: "object",
        properties: {
          include_closed: { type: "boolean", description: "Include closed leads (default: false)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_team_members",
      description: "Get list of team members/users",
      parameters: {
        type: "object",
        properties: {
          is_active: { type: "boolean", description: "Filter by active status (default: true)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "aggregate_leads",
      description: "Calculate sums, averages, min/max for lead data (e.g., total loan amount, average FICO score)",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["sum", "avg", "min", "max", "count"] },
          field: { type: "string", description: "Field to aggregate (e.g., 'loan_amount', 'fico_score')" },
          filters: { type: "object", description: "Same filters as search_leads" }
        },
        required: ["operation", "field"]
      }
    }
  }
];

// ============================================================================
// TOOL EXECUTION FUNCTIONS
// ============================================================================

async function searchLeads(args: any, supabase: any): Promise<any> {
  const { search_term, filters = {}, fields, limit = 50 } = args;
  
  let query = supabase.from('leads');
  
  const selectFields = fields && fields.length > 0 
    ? fields.join(', ')
    : 'id, lead_number, first_name, last_name, phone, email, loan_amount, loan_type, status, close_date, pipeline_stage_id, created_at, is_closed';
  
  query = query.select(selectFields);
  
  if (search_term) {
    query = query.or(
      `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,email.ilike.%${search_term}%`
    );
  }
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.pipeline_stage_id) query = query.eq('pipeline_stage_id', filters.pipeline_stage_id);
  if (filters.created_after) query = query.gte('created_at', filters.created_after);
  if (filters.created_before) query = query.lte('created_at', filters.created_before);
  if (filters.close_date_after) query = query.gte('close_date', filters.close_date_after);
  if (filters.close_date_before) query = query.lte('close_date', filters.close_date_before);
  if (filters.loan_amount_min) query = query.gte('loan_amount', filters.loan_amount_min);
  if (filters.loan_amount_max) query = query.lte('loan_amount', filters.loan_amount_max);
  if (filters.loan_type) query = query.eq('loan_type', filters.loan_type);
  if (filters.property_type) query = query.eq('property_type', filters.property_type);
  if (filters.teammate_assigned) query = query.eq('teammate_assigned', filters.teammate_assigned);
  if (filters.is_closed !== undefined) query = query.eq('is_closed', filters.is_closed);
  
  query = query.limit(Math.min(limit, 500));
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error searching leads:', error);
    return { error: error.message };
  }
  
  return {
    success: true,
    count: data.length,
    leads: data,
    source: 'Leads Database'
  };
}

async function countLeads(args: any, supabase: any): Promise<any> {
  const { filters = {}, group_by } = args;
  
  let query = supabase.from('leads').select('*', { count: 'exact', head: !group_by });
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.pipeline_stage_id) query = query.eq('pipeline_stage_id', filters.pipeline_stage_id);
  if (filters.created_after) query = query.gte('created_at', filters.created_after);
  if (filters.created_before) query = query.lte('created_at', filters.created_before);
  if (filters.close_date_after) query = query.gte('close_date', filters.close_date_after);
  if (filters.close_date_before) query = query.lte('close_date', filters.close_date_before);
  if (filters.loan_amount_min) query = query.gte('loan_amount', filters.loan_amount_min);
  if (filters.loan_amount_max) query = query.lte('loan_amount', filters.loan_amount_max);
  if (filters.loan_type) query = query.eq('loan_type', filters.loan_type);
  if (filters.property_type) query = query.eq('property_type', filters.property_type);
  if (filters.teammate_assigned) query = query.eq('teammate_assigned', filters.teammate_assigned);
  if (filters.is_closed !== undefined) query = query.eq('is_closed', filters.is_closed);
  
  const { data, error, count } = await query;
  
  if (error) return { error: error.message };
  
  if (group_by && data) {
    const grouped = data.reduce((acc: any, lead: any) => {
      const key = lead[group_by] || 'null';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    return {
      success: true,
      total_count: count,
      grouped_counts: grouped,
      grouped_by: group_by,
      source: 'Leads Database'
    };
  }
  
  return {
    success: true,
    count: count,
    source: 'Leads Database'
  };
}

async function searchContacts(args: any, supabase: any): Promise<any> {
  const { search_term, type, limit = 50 } = args;
  
  let query = supabase.from('contacts').select('*');
  
  if (search_term) {
    query = query.or(
      `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,email.ilike.%${search_term}%,phone.ilike.%${search_term}%,company.ilike.%${search_term}%`
    );
  }
  
  if (type) query = query.eq('type', type);
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    count: data.length,
    contacts: data,
    source: 'Contacts Database'
  };
}

async function getLeadById(leadId: string, supabase: any): Promise<any> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    lead: data,
    source: 'Leads Database'
  };
}

async function getContactById(contactId: string, supabase: any): Promise<any> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    contact: data,
    source: 'Contacts Database'
  };
}

async function searchTasks(args: any, supabase: any): Promise<any> {
  const { filters = {}, limit = 50 } = args;
  
  let query = supabase.from('tasks').select('*');
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
  if (filters.due_date_after) query = query.gte('due_date', filters.due_date_after);
  if (filters.due_date_before) query = query.lte('due_date', filters.due_date_before);
  
  query = query.is('deleted_at', null);
  query = query.limit(limit);
  query = query.order('due_date', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    count: data.length,
    tasks: data,
    source: 'Tasks Database'
  };
}

async function searchCondos(args: any, supabase: any): Promise<any> {
  const { search_term, approval_type, limit = 50 } = args;
  
  let query = supabase.from('condos').select('*');
  
  if (search_term) {
    query = query.or(
      `condo_name.ilike.%${search_term}%,address.ilike.%${search_term}%,city.ilike.%${search_term}%`
    );
  }
  
  if (approval_type) query = query.eq('approval_type', approval_type);
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    count: data.length,
    condos: data,
    source: 'Condo Approvals Database'
  };
}

async function getPipelineStats(args: any, supabase: any): Promise<any> {
  const { include_closed = false } = args;
  
  let query = supabase
    .from('leads')
    .select('pipeline_stage_id, pipeline_stages(name)');
  
  if (!include_closed) {
    query = query.eq('is_closed', false);
  }
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  const stageCounts = data.reduce((acc: any, lead: any) => {
    const stageName = lead.pipeline_stages?.name || 'Unknown';
    acc[stageName] = (acc[stageName] || 0) + 1;
    return acc;
  }, {});
  
  return {
    success: true,
    stage_counts: stageCounts,
    total_leads: data.length,
    source: 'Pipeline Database'
  };
}

async function getTeamMembers(args: any, supabase: any): Promise<any> {
  const { is_active = true } = args;
  
  let query = supabase.from('users').select('id, first_name, last_name, email, role');
  
  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    count: data.length,
    team_members: data,
    source: 'Users Database'
  };
}

async function aggregateLeads(args: any, supabase: any): Promise<any> {
  const { operation, field, filters = {} } = args;
  
  const leadResults = await searchLeads({ filters, fields: [field, 'id'] }, supabase);
  
  if (leadResults.error) return leadResults;
  
  const values = leadResults.leads
    .map((lead: any) => lead[field])
    .filter((v: any) => v !== null && v !== undefined && !isNaN(Number(v)))
    .map(Number);
  
  if (values.length === 0) {
    return { success: true, result: 0, count: 0, operation, field, source: 'Leads Database' };
  }
  
  let result;
  switch (operation) {
    case 'sum':
      result = values.reduce((sum: number, v: number) => sum + v, 0);
      break;
    case 'avg':
      result = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
      break;
    case 'min':
      result = Math.min(...values);
      break;
    case 'max':
      result = Math.max(...values);
      break;
    case 'count':
      result = values.length;
      break;
    default:
      return { error: `Unknown operation: ${operation}` };
  }
  
  return {
    success: true,
    result: result,
    count: values.length,
    operation: operation,
    field: field,
    source: 'Leads Database'
  };
}

async function executeTool(toolName: string, args: any, supabase: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);
  
  try {
    switch (toolName) {
      case 'search_leads':
        return await searchLeads(args, supabase);
      case 'count_leads':
        return await countLeads(args, supabase);
      case 'search_contacts':
        return await searchContacts(args, supabase);
      case 'get_lead_by_id':
        return await getLeadById(args.lead_id, supabase);
      case 'get_contact_by_id':
        return await getContactById(args.contact_id, supabase);
      case 'search_tasks':
        return await searchTasks(args, supabase);
      case 'search_condos':
        return await searchCondos(args, supabase);
      case 'get_pipeline_stats':
        return await getPipelineStats(args, supabase);
      case 'get_team_members':
        return await getTeamMembers(args, supabase);
      case 'aggregate_leads':
        return await aggregateLeads(args, supabase);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { error: error.message };
  }
}

// ============================================================================
// METADATA GENERATION
// ============================================================================

function generateMetadata(toolResults: any[]): any {
  const citations: any[] = [];
  const quickActions: any[] = [];
  
  toolResults.forEach(result => {
    const parsedResult = typeof result.content === 'string' 
      ? JSON.parse(result.content) 
      : result.content;
    
    if (parsedResult.source) {
      citations.push({
        source: parsedResult.source,
        type: result.name
      });
    }
    
    if (result.name === 'search_leads' && parsedResult.leads) {
      parsedResult.leads.slice(0, 3).forEach((lead: any) => {
        if (lead.phone) {
          quickActions.push({
            label: `Call ${lead.first_name}`,
            action: 'copy_phone',
            data: lead.phone
          });
        }
        if (lead.email) {
          quickActions.push({
            label: `Email ${lead.first_name}`,
            action: 'copy_email',
            data: lead.email
          });
        }
        if (lead.id) {
          quickActions.push({
            label: `View ${lead.first_name}'s Details`,
            action: 'open_lead',
            data: { id: lead.id, name: `${lead.first_name} ${lead.last_name}` }
          });
        }
      });
    }
    
    if (result.name === 'search_contacts' && parsedResult.contacts) {
      parsedResult.contacts.slice(0, 3).forEach((contact: any) => {
        if (contact.phone) {
          quickActions.push({
            label: `Call ${contact.first_name}`,
            action: 'copy_phone',
            data: contact.phone
          });
        }
        if (contact.email) {
          quickActions.push({
            label: `Email ${contact.first_name}`,
            action: 'copy_email',
            data: contact.email
          });
        }
      });
    }
  });
  
  return {
    citations: citations.slice(0, 5),
    quickActions: quickActions.slice(0, 6)
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message, sessionId } = await req.json();

    console.log('Processing assistant query:', { message, sessionId });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'Admin') {
      throw new Error('Admin access required');
    }

    // Load conversation history for context
    const { data: sessionMessages } = await supabase
      .from('assistant_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory = sessionMessages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    // System prompt with comprehensive CRM context
    const systemPrompt = `You are MortgageBolt Assistant, an intelligent AI helper for mortgage CRM users.

You have access to comprehensive CRM data including:
- Leads (124 fields): All borrower, loan, property, and status information
- Contacts: Agents, lenders, title companies, insurance providers
- Tasks: Team task management and assignments
- Condos: Condo approval database
- Users: Team member information
- Pipeline Stages: Workflow stages and counts

Use the available tools to answer user questions accurately. When searching:
- Use smart name matching (partial names, first/last combinations)
- Apply appropriate filters (dates, statuses, stages, amounts)
- Count records when asked "how many"
- Return specific fields when asked for details (phone, email, etc.)
- Provide context and suggestions for next steps

Always cite your data sources and offer relevant quick actions. Be concise and professional.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Log query for audit
    await supabase.from('assistant_audit_log').insert([{
      user_id: user.id,
      session_id: sessionId,
      query_text: message,
      tools_called: [],
      data_accessed: []
    }]);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Call GPT-5 with function calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_completion_tokens: 1500,
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]) {
      throw new Error('Invalid OpenAI response');
    }

    const assistantMessage = result.choices[0].message;
    let finalResponse = '';
    let metadata: any = { citations: [], quickActions: [] };

    // Check if GPT wants to use tools
    if (assistantMessage.tool_calls) {
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        const toolResult = await executeTool(toolName, toolArgs, supabase);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolName,
          content: JSON.stringify(toolResult)
        });
      }
      
      // Generate metadata from tool results
      metadata = generateMetadata(toolResults);
      
      // Call GPT again with tool results
      const finalApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...messages,
            assistantMessage,
            ...toolResults
          ],
          max_completion_tokens: 1500,
        }),
      });
      
      const finalResult = await finalApiResponse.json();
      finalResponse = finalResult.choices[0].message.content;
      
      // Update audit log with tool usage
      const toolsUsed = toolResults.map(r => r.name);
      const dataAccessed = toolResults.map(r => {
        const parsed = JSON.parse(r.content);
        return {
          tool: r.name,
          record_count: parsed.count || parsed.leads?.length || parsed.contacts?.length || 0
        };
      });

      await supabase.from('assistant_audit_log')
        .update({
          response_summary: finalResponse.substring(0, 200),
          tools_called: toolsUsed,
          data_accessed: dataAccessed
        })
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);
    } else {
      finalResponse = assistantMessage.content;
      
      await supabase.from('assistant_audit_log')
        .update({
          response_summary: finalResponse.substring(0, 200)
        })
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return new Response(JSON.stringify({ response: finalResponse, metadata }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in assistant-chat:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
