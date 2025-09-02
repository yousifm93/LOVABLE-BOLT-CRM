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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message, sessionId } = await req.json();

    console.log('Processing assistant query:', { message, sessionId });

    // Get user from auth header
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

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'Admin') {
      throw new Error('Admin access required');
    }

    // Log the query for audit trail
    await supabase.from('assistant_audit_log').insert([{
      user_id: user.id,
      session_id: sessionId,
      query_text: message,
      tools_called: [],
      data_accessed: []
    }]);

    // Determine if this is a data query or general question
    const isDataQuery = await classifyQuery(message);
    
    let response = '';
    let metadata: any = {};

    if (isDataQuery) {
      // Execute data search and retrieval
      const dataResult = await searchCRMData(message, supabase);
      response = await generateDataResponse(message, dataResult, openAIApiKey);
      metadata = {
        citations: dataResult.sources,
        quickActions: generateQuickActions(dataResult)
      };
    } else {
      // Generate general response
      response = await generateGeneralResponse(message, openAIApiKey);
    }

    // Update audit log with tools used
    await supabase.from('assistant_audit_log')
      .update({
        response_summary: response.substring(0, 200),
        tools_called: metadata.citations?.map((c: any) => c.type) || []
      })
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ response, metadata }), {
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

async function classifyQuery(message: string): Promise<boolean> {
  // Simple classification based on keywords
  const dataKeywords = [
    'phone', 'email', 'contact', 'lead', 'borrower', 'client',
    'task', 'document', 'loan', 'status', 'find', 'search',
    'who', 'what', 'when', 'where', 'how many', 'list'
  ];
  
  const lowerMessage = message.toLowerCase();
  return dataKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function searchCRMData(query: string, supabase: any): Promise<any> {
  const results: any = { sources: [], data: {} };
  
  // Search leads
  if (query.toLowerCase().includes('lead') || query.toLowerCase().includes('borrower')) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, loan_amount, loan_type')
      .limit(10);
    
    if (leads && leads.length > 0) {
      results.data.leads = leads;
      results.sources.push({ source: 'Leads Database', type: 'leads' });
    }
  }

  // Search contacts
  if (query.toLowerCase().includes('contact') || query.toLowerCase().includes('agent')) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, company, type')
      .limit(10);
    
    if (contacts && contacts.length > 0) {
      results.data.contacts = contacts;
      results.sources.push({ source: 'Contacts Database', type: 'contacts' });
    }
  }

  // Search tasks
  if (query.toLowerCase().includes('task') || query.toLowerCase().includes('todo')) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, assignee_id, priority')
      .limit(10);
    
    if (tasks && tasks.length > 0) {
      results.data.tasks = tasks;
      results.sources.push({ source: 'Tasks Database', type: 'tasks' });
    }
  }

  // Search condos
  if (query.toLowerCase().includes('condo')) {
    const { data: condos } = await supabase
      .from('condos')
      .select('id, condo_name, approval_type, approval_expiration_date, city, state')
      .limit(10);
    
    if (condos && condos.length > 0) {
      results.data.condos = condos;
      results.sources.push({ source: 'Condo Approvals', type: 'condos' });
    }
  }

  return results;
}

async function generateDataResponse(query: string, dataResult: any, apiKey: string): Promise<string> {
  if (!apiKey) {
    return "I found some data but OpenAI API key is not configured.";
  }

  const systemPrompt = `You are MortgageBolt Assistant, an AI helper for mortgage professionals. 
Provide concise, helpful responses about CRM data. Format responses as:
1. Direct answer to the question
2. Key details (bullet points if multiple items)
3. Next steps or recommendations (if applicable)

Keep responses under 200 words. Use professional but friendly tone.`;

  const dataContext = JSON.stringify(dataResult.data, null, 2);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Query: ${query}\n\nData found:\n${dataContext}` }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    return "I found the requested data but couldn't generate a formatted response.";
  }
}

async function generateGeneralResponse(query: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    return "I'd be happy to help with general questions, but OpenAI API key is not configured.";
  }

  const systemPrompt = `You are MortgageBolt Assistant, an AI helper for mortgage CRM users. 
Provide helpful information about mortgage processes, CRM best practices, and general business guidance.
Keep responses concise and actionable. If the question requires specific CRM data, ask for clarification.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    return "I'm having trouble generating a response right now. Please try again.";
  }
}

function generateQuickActions(dataResult: any): any[] {
  const actions: any[] = [];
  
  // Generate actions based on data type
  if (dataResult.data.leads) {
    dataResult.data.leads.slice(0, 3).forEach((lead: any) => {
      if (lead.phone) {
        actions.push({
          label: `Call ${lead.first_name}`,
          action: 'copy_phone',
          data: lead.phone
        });
      }
      if (lead.email) {
        actions.push({
          label: `Email ${lead.first_name}`,
          action: 'copy_email',
          data: lead.email
        });
      }
    });
  }

  return actions.slice(0, 4); // Limit to 4 actions
}