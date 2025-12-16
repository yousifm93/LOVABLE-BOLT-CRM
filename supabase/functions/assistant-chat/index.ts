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
// TOOL DEFINITIONS - Comprehensive CRM Tools
// ============================================================================

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Search BORROWERS and LOAN APPLICATIONS. Use for: borrower names, phone numbers, emails, loan amounts, application statuses, close dates. Examples: 'What is John Doe's phone?', 'Show me FHA loans over $300k', 'Leads this month'. DO NOT use for: real estate agents (use search_agents), lenders (use search_lenders).",
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
              lead_on_date_after: { type: "string", description: "ISO date (YYYY-MM-DD)" },
              lead_on_date_before: { type: "string", description: "ISO date (YYYY-MM-DD)" },
              close_date_after: { type: "string" },
              close_date_before: { type: "string" },
              loan_amount_min: { type: "number" },
              loan_amount_max: { type: "number" },
              loan_type: { type: "string" },
              property_type: { type: "string" },
              teammate_assigned: { type: "string", description: "UUID of assigned user" },
              is_closed: { type: "boolean" },
              app_complete_at_after: { type: "string" },
              app_complete_at_before: { type: "string" }
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
      description: "Count leads matching criteria. Use for: 'How many leads this month?', 'Count of FHA loans', 'Total applications'. Returns numeric count, not lead details.",
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
      description: "Search master contact list (general contacts not in other categories like agents or lenders)",
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
      name: "search_agents",
      description: "Search REAL ESTATE AGENTS (buyer agents, listing agents). Use for: agent names, agent phone numbers, agent meetings, agent calls. Examples: 'What is Mary Johnson's number?', 'Agents we met this month', 'Show me A-rank agents'. DO NOT use for: borrowers (use search_leads).",
      parameters: {
        type: "object",
        properties: {
          search_term: { 
            type: "string", 
            description: "Search by agent name (first, last, or full name)" 
          },
          filters: {
            type: "object",
            properties: {
              brokerage: { type: "string" },
              agent_rank: { type: "string", enum: ["A", "B", "C", "D", "F"] },
              has_email: { type: "boolean" },
              has_phone: { type: "boolean" },
              face_to_face_meeting_after: { type: "string" },
              face_to_face_meeting_before: { type: "string" },
              last_agent_call_after: { type: "string" },
              last_agent_call_before: { type: "string" }
            }
          },
          limit: { type: "number", description: "Max results (default: 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_lenders",
      description: "Search APPROVED LENDERS. Use for: lender names, account executives, lender products, LTV limits, FICO requirements. Examples: 'What lenders do DSCR?', 'Show me KIND Lending info', 'Lenders with 90% LTV'.",
      parameters: {
        type: "object",
        properties: {
          search_term: { 
            type: "string", 
            description: "Search by lender name or account executive name" 
          },
          filters: {
            type: "object",
            properties: {
              lender_type: { type: "string" },
              status: { type: "string" },
              has_dscr: { type: "boolean" },
              has_bank_statement: { type: "boolean" },
              min_fico_max: { type: "number", description: "Max value for min_fico (e.g., 620 = lenders accepting 620+ scores)" }
            }
          },
          limit: { type: "number", description: "Max results (default: 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_lead_by_id",
      description: "Get complete details for a specific lead by ID",
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
      name: "search_tasks",
      description: "Search TASKS. Use for: tasks due today, my tasks, overdue tasks, tasks by priority. Examples: 'Show me tasks due today', 'What are my high priority tasks?', 'Tasks assigned to Yousif'.",
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
  },
  {
    type: "function",
    function: {
      name: "update_lead",
      description: "Update fields on a lead/borrower record. Use for: changing dates, updating statuses, assigning lenders or agents.",
      parameters: {
        type: "object",
        properties: {
          borrower_name: {
            type: "string",
            description: "Name of borrower to find and update"
          },
          updates: {
            type: "object",
            description: "Fields to update. Common fields: close_date (YYYY-MM-DD), appraisal_status, title_status, condo_status, hoi_status, loan_status, lender_name, disclosure_status, cd_status, ba_status"
          }
        },
        required: ["borrower_name", "updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task for a borrower or team member. Use for: 'Create a task for John to follow up', 'Remind me to call borrower tomorrow', 'Add a task to review appraisal'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          borrower_name: { type: "string", description: "Name of borrower to associate task with" },
          due_date: { type: "string", description: "Due date (YYYY-MM-DD), defaults to tomorrow" },
          priority: { type: "string", enum: ["Low", "Medium", "High", "Urgent"], description: "Task priority, defaults to Medium" },
          description: { type: "string", description: "Optional task description" },
          assignee_name: { type: "string", description: "Team member to assign task to (defaults to current user)" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Create a new lead/borrower in the pipeline. Use for: 'Add a new lead John Smith', 'Create a borrower for Mary Johnson'.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Borrower first name" },
          last_name: { type: "string", description: "Borrower last name" },
          email: { type: "string", description: "Borrower email" },
          phone: { type: "string", description: "Borrower phone number" },
          loan_amount: { type: "number", description: "Requested loan amount" },
          property_address: { type: "string", description: "Subject property address" },
          source: { type: "string", description: "Lead source (website, referral, etc.)" }
        },
        required: ["first_name", "last_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a new contact (real estate agent, title company, etc.). Use for: 'Add agent Sarah from Keller Williams', 'Create a new title contact'.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "First name" },
          last_name: { type: "string", description: "Last name" },
          email: { type: "string" },
          phone: { type: "string" },
          company: { type: "string", description: "Company/brokerage name" },
          type: { type: "string", enum: ["buyer_agent", "listing_agent", "title", "insurance", "other"], description: "Contact type" }
        },
        required: ["first_name", "last_name", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_passwords",
      description: "Retrieve stored service credentials/passwords. Use for: 'What's the password for MLS?', 'Login for Quick Pricer', 'Credentials for Encompass'. Admin-only function.",
      parameters: {
        type: "object",
        properties: {
          service_name: { type: "string", description: "Name of service to look up (fuzzy match)" }
        }
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
    : 'id, lead_number, first_name, last_name, phone, email, loan_amount, loan_type, status, close_date, pipeline_stage_id, created_at, lead_on_date, is_closed';
  
  query = query.select(selectFields);
  
  if (search_term) {
    const parts = search_term.trim().split(/\s+/);
    
    if (parts.length === 2) {
      const [part1, part2] = parts;
      query = query.or(
        `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),` +
        `and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%),` +
        `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,` +
        `email.ilike.%${search_term}%,phone.ilike.%${search_term}%`
      );
    } else {
      query = query.or(
        `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,` +
        `email.ilike.%${search_term}%,phone.ilike.%${search_term}%`
      );
    }
  }
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.pipeline_stage_id) query = query.eq('pipeline_stage_id', filters.pipeline_stage_id);
  if (filters.created_after) query = query.gte('created_at', filters.created_after);
  if (filters.created_before) query = query.lte('created_at', filters.created_before);
  if (filters.lead_on_date_after) query = query.gte('lead_on_date', filters.lead_on_date_after);
  if (filters.lead_on_date_before) query = query.lt('lead_on_date', filters.lead_on_date_before);
  if (filters.close_date_after) query = query.gte('close_date', filters.close_date_after);
  if (filters.close_date_before) query = query.lte('close_date', filters.close_date_before);
  if (filters.loan_amount_min) query = query.gte('loan_amount', filters.loan_amount_min);
  if (filters.loan_amount_max) query = query.lte('loan_amount', filters.loan_amount_max);
  if (filters.loan_type) query = query.eq('loan_type', filters.loan_type);
  if (filters.property_type) query = query.eq('property_type', filters.property_type);
  if (filters.teammate_assigned) query = query.eq('teammate_assigned', filters.teammate_assigned);
  if (filters.is_closed !== undefined) query = query.eq('is_closed', filters.is_closed);
  if (filters.app_complete_at_after) query = query.gte('app_complete_at', filters.app_complete_at_after);
  if (filters.app_complete_at_before) query = query.lt('app_complete_at', filters.app_complete_at_before);
  
  query = query.limit(Math.min(limit, 500));
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, leads: data };
}

async function countLeads(args: any, supabase: any): Promise<any> {
  const { filters = {}, group_by } = args;
  
  let query = supabase.from('leads').select('*', { count: 'exact', head: !group_by });
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.pipeline_stage_id) query = query.eq('pipeline_stage_id', filters.pipeline_stage_id);
  if (filters.created_after) query = query.gte('created_at', filters.created_after);
  if (filters.created_before) query = query.lt('created_at', filters.created_before);
  if (filters.lead_on_date_after) query = query.gte('lead_on_date', filters.lead_on_date_after);
  if (filters.lead_on_date_before) query = query.lt('lead_on_date', filters.lead_on_date_before);
  if (filters.close_date_after) query = query.gte('close_date', filters.close_date_after);
  if (filters.close_date_before) query = query.lte('close_date', filters.close_date_before);
  if (filters.loan_amount_min) query = query.gte('loan_amount', filters.loan_amount_min);
  if (filters.loan_amount_max) query = query.lte('loan_amount', filters.loan_amount_max);
  if (filters.loan_type) query = query.eq('loan_type', filters.loan_type);
  if (filters.property_type) query = query.eq('property_type', filters.property_type);
  if (filters.teammate_assigned) query = query.eq('teammate_assigned', filters.teammate_assigned);
  if (filters.is_closed !== undefined) query = query.eq('is_closed', filters.is_closed);
  if (filters.app_complete_at_after) query = query.gte('app_complete_at', filters.app_complete_at_after);
  if (filters.app_complete_at_before) query = query.lt('app_complete_at', filters.app_complete_at_before);
  
  const { data, error, count } = await query;
  
  if (error) return { error: error.message };
  
  if (group_by && data) {
    const grouped = data.reduce((acc: any, lead: any) => {
      const key = lead[group_by] || 'null';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { success: true, grouped_counts: grouped, total: count };
  }
  
  return { success: true, count };
}

async function searchContacts(args: any, supabase: any): Promise<any> {
  const { search_term, type, limit = 50 } = args;
  
  let query = supabase.from('contacts')
    .select('id, first_name, last_name, email, phone, company, type, notes');
  
  if (search_term) {
    query = query.or(
      `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,` +
      `email.ilike.%${search_term}%,phone.ilike.%${search_term}%,company.ilike.%${search_term}%`
    );
  }
  
  if (type) query = query.eq('type', type);
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, contacts: data };
}

async function searchAgents(args: any, supabase: any): Promise<any> {
  const { search_term, filters = {}, limit = 50 } = args;
  
  let query = supabase.from('buyer_agents')
    .select('id, first_name, last_name, email, phone, brokerage, agent_rank, last_agent_call, next_agent_call, face_to_face_meeting, notes')
    .is('deleted_at', null);
  
  if (search_term) {
    const parts = search_term.trim().split(/\s+/);
    
    if (parts.length === 2) {
      const [part1, part2] = parts;
      query = query.or(
        `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),` +
        `and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%),` +
        `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,` +
        `email.ilike.%${search_term}%,phone.ilike.%${search_term}%,brokerage.ilike.%${search_term}%`
      );
    } else {
      query = query.or(
        `first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,` +
        `email.ilike.%${search_term}%,phone.ilike.%${search_term}%,brokerage.ilike.%${search_term}%`
      );
    }
  }
  
  if (filters.brokerage) query = query.ilike('brokerage', `%${filters.brokerage}%`);
  if (filters.agent_rank) query = query.eq('agent_rank', filters.agent_rank);
  if (filters.has_email) query = query.not('email', 'is', null);
  if (filters.has_phone) query = query.not('phone', 'is', null);
  if (filters.face_to_face_meeting_after) query = query.gte('face_to_face_meeting', filters.face_to_face_meeting_after);
  if (filters.face_to_face_meeting_before) query = query.lt('face_to_face_meeting', filters.face_to_face_meeting_before);
  if (filters.last_agent_call_after) query = query.gte('last_agent_call', filters.last_agent_call_after);
  if (filters.last_agent_call_before) query = query.lt('last_agent_call', filters.last_agent_call_before);
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, agents: data };
}

async function searchLenders(args: any, supabase: any): Promise<any> {
  const { search_term, filters = {}, limit = 50 } = args;
  
  let query = supabase.from('lenders')
    .select('id, lender_name, lender_type, account_executive, account_executive_email, account_executive_phone, status, min_fico, max_loan_amount, min_loan_amount, dscr, bank_statement, notes');
  
  if (search_term) {
    query = query.or(
      `lender_name.ilike.%${search_term}%,account_executive.ilike.%${search_term}%`
    );
  }
  
  if (filters.lender_type) query = query.eq('lender_type', filters.lender_type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.has_dscr) query = query.eq('dscr', 'Y');
  if (filters.has_bank_statement) query = query.eq('bank_statement', 'Y');
  if (filters.min_fico_max) query = query.lte('min_fico', filters.min_fico_max);
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, lenders: data };
}

async function getLeadById(leadId: string, supabase: any): Promise<any> {
  const { data, error } = await supabase.from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
  
  if (error) return { error: error.message };
  
  return { success: true, lead: data };
}

async function searchTasks(args: any, supabase: any): Promise<any> {
  const { filters = {}, limit = 50 } = args;
  
  let query = supabase.from('tasks')
    .select('id, title, description, status, priority, due_date, assignee_id, borrower_id, created_at')
    .is('deleted_at', null);
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
  if (filters.due_date_after) query = query.gte('due_date', filters.due_date_after);
  if (filters.due_date_before) query = query.lt('due_date', filters.due_date_before);
  
  query = query.order('due_date', { ascending: true }).limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, tasks: data };
}

async function searchCondos(args: any, supabase: any): Promise<any> {
  const { search_term, approval_type, limit = 50 } = args;
  
  let query = supabase.from('condos')
    .select('id, condo_name, street_address, city, state, zip, approval_type, approval_source, approval_expiration_date');
  
  if (search_term) {
    query = query.or(
      `condo_name.ilike.%${search_term}%,street_address.ilike.%${search_term}%,city.ilike.%${search_term}%`
    );
  }
  
  if (approval_type) query = query.eq('approval_type', approval_type);
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, condos: data };
}

async function getPipelineStats(args: any, supabase: any): Promise<any> {
  const { include_closed = false } = args;
  
  let query = supabase.from('leads')
    .select('pipeline_stage_id', { count: 'exact' });
  
  if (!include_closed) {
    query = query.or('is_closed.is.null,is_closed.eq.false');
  }
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  const counts = data.reduce((acc: any, lead: any) => {
    const stage = lead.pipeline_stage_id || 'unassigned';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});
  
  return { success: true, stage_counts: counts, total: data.length };
}

async function getTeamMembers(args: any, supabase: any): Promise<any> {
  const { is_active = true } = args;
  
  let query = supabase.from('users')
    .select('id, first_name, last_name, email, role, is_active');
  
  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  return { success: true, count: data.length, members: data };
}

async function aggregateLeads(args: any, supabase: any): Promise<any> {
  const { operation, field, filters = {} } = args;
  
  let query = supabase.from('leads').select(field);
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.pipeline_stage_id) query = query.eq('pipeline_stage_id', filters.pipeline_stage_id);
  if (filters.created_after) query = query.gte('created_at', filters.created_after);
  if (filters.created_before) query = query.lt('created_at', filters.created_before);
  if (filters.is_closed !== undefined) query = query.eq('is_closed', filters.is_closed);
  
  const { data, error } = await query;
  
  if (error) return { error: error.message };
  
  const values = data.map((d: any) => d[field]).filter((v: any) => v !== null && v !== undefined);
  
  let result: any;
  switch (operation) {
    case 'sum':
      result = values.reduce((a: number, b: number) => a + Number(b), 0);
      break;
    case 'avg':
      result = values.length > 0 ? values.reduce((a: number, b: number) => a + Number(b), 0) / values.length : 0;
      break;
    case 'min':
      result = values.length > 0 ? Math.min(...values.map(Number)) : null;
      break;
    case 'max':
      result = values.length > 0 ? Math.max(...values.map(Number)) : null;
      break;
    case 'count':
      result = values.length;
      break;
  }
  
  return { success: true, operation, field, result, sample_size: values.length };
}

async function updateLead(args: any, supabase: any): Promise<any> {
  const { borrower_name, updates } = args;
  
  // Find the lead by name
  const parts = borrower_name.trim().split(/\s+/);
  let searchQuery = supabase.from('leads').select('id, first_name, last_name');
  
  if (parts.length >= 2) {
    const [part1, part2] = parts;
    searchQuery = searchQuery.or(
      `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),` +
      `and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`
    );
  } else {
    searchQuery = searchQuery.or(
      `first_name.ilike.%${borrower_name}%,last_name.ilike.%${borrower_name}%`
    );
  }
  
  const { data: leads, error: searchError } = await searchQuery.limit(5);
  
  if (searchError) return { error: searchError.message };
  if (!leads || leads.length === 0) return { error: `No borrower found matching "${borrower_name}"` };
  if (leads.length > 1) {
    return { 
      error: `Multiple borrowers found. Please be more specific.`,
      matches: leads.map((l: any) => `${l.first_name} ${l.last_name}`)
    };
  }
  
  const targetLead = leads[0];
  
  // Handle lender lookup if lender_name is in updates
  if (updates.lender_name) {
    const { data: lender } = await supabase.from('lenders')
      .select('id')
      .ilike('lender_name', `%${updates.lender_name}%`)
      .limit(1)
      .single();
    
    if (lender) {
      updates.approved_lender_id = lender.id;
    }
    delete updates.lender_name;
  }
  
  const { error: updateError } = await supabase.from('leads')
    .update(updates)
    .eq('id', targetLead.id);
  
  if (updateError) return { error: updateError.message };
  
  return {
    success: true,
    message: `✓ ${targetLead.first_name} ${targetLead.last_name} updated.`,
    updated_fields: Object.keys(updates),
    lead_id: targetLead.id
  };
}

async function createTask(args: any, supabase: any): Promise<any> {
  const { title, borrower_name, due_date, priority = 'Medium', description, assignee_name } = args;
  
  // Calculate default due date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDueDate = tomorrow.toISOString().split('T')[0];
  
  let borrowerId = null;
  let borrowerFullName = null;
  
  // Find borrower if specified
  if (borrower_name) {
    const parts = borrower_name.trim().split(/\s+/);
    let searchQuery = supabase.from('leads').select('id, first_name, last_name');
    
    if (parts.length >= 2) {
      const [part1, part2] = parts;
      searchQuery = searchQuery.or(
        `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),` +
        `and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`
      );
    } else {
      searchQuery = searchQuery.or(
        `first_name.ilike.%${borrower_name}%,last_name.ilike.%${borrower_name}%`
      );
    }
    
    const { data: leads } = await searchQuery.limit(1);
    
    if (leads && leads.length > 0) {
      borrowerId = leads[0].id;
      borrowerFullName = `${leads[0].first_name} ${leads[0].last_name}`;
    }
  }
  
  // Find assignee if specified
  let assigneeId = null;
  if (assignee_name) {
    const { data: users } = await supabase.from('users')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${assignee_name}%,last_name.ilike.%${assignee_name}%`)
      .limit(1);
    
    if (users && users.length > 0) {
      assigneeId = users[0].id;
    }
  }
  
  const taskData = {
    title,
    description: description || null,
    borrower_id: borrowerId,
    assignee_id: assigneeId,
    due_date: due_date || defaultDueDate,
    priority,
    status: 'To Do'
  };
  
  const { data: task, error } = await supabase.from('tasks')
    .insert([taskData])
    .select()
    .single();
  
  if (error) return { error: error.message };
  
  const formattedDueDate = new Date(task.due_date).toLocaleDateString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric' 
  });
  
  return {
    success: true,
    message: `✓ Task created: "${title}"${borrowerFullName ? ` for ${borrowerFullName}` : ''}, due ${formattedDueDate}`,
    task_id: task.id
  };
}

async function createLead(args: any, supabase: any): Promise<any> {
  const { first_name, last_name, email, phone, loan_amount, property_address, source } = args;
  
  const leadData: any = {
    first_name,
    last_name,
    status: 'Working on it'
  };
  
  if (email) leadData.email = email;
  if (phone) leadData.phone = phone;
  if (loan_amount) leadData.loan_amount = loan_amount;
  if (property_address) leadData.subject_address_1 = property_address;
  if (source) leadData.referral_method = source;
  
  const { data: lead, error } = await supabase.from('leads')
    .insert([leadData])
    .select('id, first_name, last_name, lead_number')
    .single();
  
  if (error) return { error: error.message };
  
  let details = [`Name: ${first_name} ${last_name}`];
  if (phone) details.push(`Phone: ${phone}`);
  if (email) details.push(`Email: ${email}`);
  if (loan_amount) details.push(`Loan Amount: $${loan_amount.toLocaleString()}`);
  
  return {
    success: true,
    message: `✓ New lead created:\n   • ${details.join('\n   • ')}\n   • Stage: Leads`,
    lead_id: lead.id,
    lead_number: lead.lead_number
  };
}

async function createContact(args: any, supabase: any): Promise<any> {
  const { first_name, last_name, email, phone, company, type } = args;
  
  // For agents, use buyer_agents table
  if (type === 'buyer_agent' || type === 'listing_agent') {
    const agentData: any = {
      first_name,
      last_name,
      brokerage: company || 'Unknown'
    };
    
    if (email) agentData.email = email;
    if (phone) agentData.phone = phone;
    
    const { data: agent, error } = await supabase.from('buyer_agents')
      .insert([agentData])
      .select()
      .single();
    
    if (error) return { error: error.message };
    
    return {
      success: true,
      message: `✓ New real estate agent added:\n   • Name: ${first_name} ${last_name}\n   • Brokerage: ${company || 'Unknown'}${phone ? `\n   • Phone: ${phone}` : ''}`,
      agent_id: agent.id
    };
  }
  
  // For other contacts, use contacts table
  const contactData: any = {
    first_name,
    last_name,
    type
  };
  
  if (email) contactData.email = email;
  if (phone) contactData.phone = phone;
  if (company) contactData.company = company;
  
  const { data: contact, error } = await supabase.from('contacts')
    .insert([contactData])
    .select()
    .single();
  
  if (error) return { error: error.message };
  
  return {
    success: true,
    message: `✓ New ${type} contact added:\n   • Name: ${first_name} ${last_name}${company ? `\n   • Company: ${company}` : ''}${phone ? `\n   • Phone: ${phone}` : ''}`,
    contact_id: contact.id
  };
}

async function getPasswords(args: any, supabase: any): Promise<any> {
  const { service_name } = args;
  
  let query = supabase.from('service_credentials')
    .select('id, service_name, url, username, password, description, tags');
  
  if (service_name) {
    query = query.ilike('service_name', `%${service_name}%`);
  }
  
  const { data, error } = await query.limit(10);
  
  if (error) return { error: error.message };
  
  if (!data || data.length === 0) {
    return { error: `No credentials found for "${service_name || 'any service'}"` };
  }
  
  // Format for display
  const credentials = data.map((cred: any) => ({
    service: cred.service_name,
    url: cred.url,
    username: cred.username,
    password: cred.password,
    description: cred.description
  }));
  
  return { success: true, count: credentials.length, credentials };
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
      case 'search_agents':
        return await searchAgents(args, supabase);
      case 'search_lenders':
        return await searchLenders(args, supabase);
      case 'get_lead_by_id':
        return await getLeadById(args.lead_id, supabase);
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
      case 'update_lead':
        return await updateLead(args, supabase);
      case 'create_task':
        return await createTask(args, supabase);
      case 'create_lead':
        return await createLead(args, supabase);
      case 'create_contact':
        return await createContact(args, supabase);
      case 'get_passwords':
        return await getPasswords(args, supabase);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return { error: error.message };
  }
}

// ============================================================================
// SYSTEM PROMPT GENERATOR
// ============================================================================

function generateSystemPrompt(): string {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentMonth = now.toISOString().substring(0, 7);
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStart = nextMonth.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const weekStart = startOfWeek.toISOString().split('T')[0];
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000);
  const weekEnd = endOfWeek.toISOString().split('T')[0];
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const dayOfMonth = now.getDate();

  return `You are the MortgageBolt Assistant, an AI-powered helper integrated into a mortgage CRM system.

## Core Behavior Rules

### 1. Be Direct and Concise
- Give answers immediately without narrating your thought process
- NEVER show messages like "Searching...", "One moment...", "Let me look that up..."
- NEVER list multiple steps you're taking - just return the result
- Wrong: "Let me search the database for that contact. Checking leads... Checking contacts... Found it!"
- Right: "John Smith's phone number is (305) 555-1234."

### 2. Be Accurate - Search Everything
When looking for a person, search ALL relevant tables before saying "not found":
1. leads table (borrowers)
2. contacts table (master contact list)
3. buyer_agents table (real estate agents)
4. lenders table (check account_executive field)
Use fuzzy/partial matching for names (handle typos, nicknames, partial names).
Only respond "not found" after exhausting all tables.

### 3. Be Action-Oriented
When asked to do something, DO IT - don't describe what you would do.
- Wrong: "I can't create tasks directly. Here's what you would need to do..."
- Right: *Actually create the task* → "✓ Task created: Follow up on appraisal for Cullen Mahoney, due tomorrow."

### 4. Ask Clarifying Questions (When Necessary)
If required information is missing for an action, ask ONE clear question:
- "What priority should I set for this task? (Low / Medium / High / Urgent)"
- "Which email template would you like to use?"
- "What due date for this task?"
Don't ask unnecessary questions if reasonable defaults exist.

## Current Date Context
- Today: ${currentDate} (${monthName} ${dayOfMonth}, ${now.getFullYear()})
- Tomorrow: ${tomorrow}
- Yesterday: ${yesterday}
- This Week: ${weekStart} to ${weekEnd}
- This Month: ${monthName} 1-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}, ${now.getFullYear()}

## Date Filtering (Use These Exact Formats)
- "leads this month" → lead_on_date_after: '${currentMonthStart}', lead_on_date_before: '${nextMonthStart}'
- "leads today" → lead_on_date_after: '${currentDate}', lead_on_date_before: '${tomorrow}'
- "apps this month" → app_complete_at_after: '${currentMonthStart}', app_complete_at_before: '${nextMonthStart}'
- "tasks due today" → due_date_after: '${currentDate}', due_date_before: '${tomorrow}'

## Pipeline Stages (in order)
1. Leads - New inquiries, not yet applied
2. Pending App - Application started but incomplete
3. Screening - Application submitted, under initial review
4. Pre-Qualified - Basic qualification confirmed
5. Pre-Approved - Full pre-approval issued
6. Active - Loan in process (under contract)
7. Past Clients - Closed loans / completed transactions

## Response Formatting

### For Contact Lookups
[Name]'s phone number is [number].
[Name]'s email is [email].

If found in multiple tables:
Found 2 records for "John Smith":
1. Lead - John Smith: (305) 555-1234, john@email.com (Pre-Qualified stage)
2. Agent - John Smith: (786) 555-5678, jsmith@company.com

### For Metrics/Counts
Always specify the exact date range:
16 applications this month (${monthName} 1-${dayOfMonth}, ${now.getFullYear()}).
4 tasks due today.

### For Completed Actions
Use checkmark and clear confirmation:
✓ Task created: [title] for [person], due [date]
✓ Lead status updated: [name] moved to [stage]
✓ New contact added: [name]

### For Errors
Be specific about what went wrong:
Could not find anyone named "Sevim Abaza" in leads, contacts, agents, or lenders.
Did you mean: Selim Abaza, Sevda Abazi?

### For Password/Credential Lookups
[Service] credentials:
   • Username: [username]
   • Password: [password]
   • URL: [url]

## What NOT To Do
1. ❌ Don't narrate your search process ("Searching contacts... Searching leads...")
2. ❌ Don't say "I can't do that" for supported actions - actually do them
3. ❌ Don't give verbose explanations when a simple answer works
4. ❌ Don't ask for confirmation before simple queries (just answer)
5. ❌ Don't use wrong date ranges (November when user asks about "this month" in December)
6. ❌ Don't give up after searching one table - search all relevant tables
7. ❌ Don't show internal field names or technical details to users`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const debugMode = url.searchParams.get('debug');
    
    // Debug endpoint for viewing prompt and tools (admin-only)
    if (debugMode === 'prompt') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid user token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userProfile?.role !== 'Admin') {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        systemPrompt: generateSystemPrompt(),
        tools: TOOL_DEFINITIONS 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message, sessionId, devMode } = await req.json();

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

    const systemPrompt = generateSystemPrompt();

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
        model: 'gpt-5',
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
    let toolTrace: any[] = [];

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
        
        // Build tool trace for dev mode
        if (devMode) {
          const resultParsed = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
          toolTrace.push({
            tool: toolName,
            args: toolArgs,
            resultCount: resultParsed.count || resultParsed.leads?.length || resultParsed.contacts?.length || resultParsed.agents?.length || resultParsed.lenders?.length || 0
          });
        }
      }
      
      // Generate metadata from tool results
      if (devMode) {
        metadata.toolTrace = toolTrace;
      }
      
      // Call GPT-5 again with tool results
      const finalApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5',
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
          record_count: parsed.count || parsed.leads?.length || parsed.contacts?.length || parsed.agents?.length || 0
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

    return new Response(JSON.stringify({ 
      response: finalResponse, 
      metadata 
    }), {
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
