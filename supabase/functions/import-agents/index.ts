import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

function cleanPhone(phone: string): string {
  if (!phone) return '';
  
  // Handle scientific notation (e.g., 1.17865E+11)
  if (phone.includes('E+') || phone.includes('e+')) {
    const num = parseFloat(phone);
    if (!isNaN(num)) {
      phone = Math.round(num).toString();
    }
  }
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 1 if 11 digits (US country code)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

function cleanEmail(email: string): string {
  if (!email) return '';
  
  // Remove "null" prefix if present
  let cleaned = email.replace(/^null/i, '');
  
  // Handle duplicate emails like "email - email.com"
  if (cleaned.includes(' - ')) {
    cleaned = cleaned.split(' - ')[0];
  }
  
  // Unescape backslashes from CSV parsing
  cleaned = cleaned.replace(/\\/g, '');
  
  return cleaned.trim().toLowerCase();
}

function parseCSV(csvText: string): AgentRow[] {
  const lines = csvText.trim().split('\n');
  const agents: AgentRow[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with potential commas in fields
    const parts = line.split(',');
    if (parts.length >= 2) {
      agents.push({
        first_name: (parts[0] || '').trim(),
        last_name: (parts[1] || '').trim(),
        email: cleanEmail(parts[2] || ''),
        phone: cleanPhone(parts[3] || ''),
      });
    }
  }
  
  return agents;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvUrl, csvData: directCsvData } = await req.json();
    
    let csvData: string;
    
    if (directCsvData) {
      csvData = directCsvData;
      console.log('Using direct CSV data');
    } else if (csvUrl) {
      console.log('Fetching CSV from:', csvUrl);
      const csvResponse = await fetch(csvUrl);
      if (!csvResponse.ok) {
        throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
      }
      csvData = await csvResponse.text();
    } else {
      return new Response(JSON.stringify({ error: 'No CSV data or URL provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Starting agent import...');
    
    // Parse CSV
    const importAgents = parseCSV(csvData);
    console.log(`Parsed ${importAgents.length} agents from CSV`);

    // Fetch existing agents (including soft-deleted ones to check for resurrection)
    const { data: existingAgents, error: fetchError } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, email, phone, deleted_at');

    if (fetchError) throw fetchError;
    
    const activeAgents = existingAgents?.filter(a => !a.deleted_at) || [];
    console.log(`Found ${activeAgents.length} existing active agents`);

    // Fetch agents that are linked to leads (buyer_agent_id or listing_agent_id)
    const { data: linkedBuyerAgents } = await supabase
      .from('leads')
      .select('buyer_agent_id')
      .not('buyer_agent_id', 'is', null);
    
    const { data: linkedListingAgents } = await supabase
      .from('leads')
      .select('listing_agent_id')
      .not('listing_agent_id', 'is', null);

    const linkedAgentIds = new Set<string>();
    linkedBuyerAgents?.forEach(l => l.buyer_agent_id && linkedAgentIds.add(l.buyer_agent_id));
    linkedListingAgents?.forEach(l => l.listing_agent_id && linkedAgentIds.add(l.listing_agent_id));
    console.log(`${linkedAgentIds.size} agents are linked to leads`);

    // Create lookup maps for existing agents (only active ones)
    const emailMap = new Map<string, typeof activeAgents[0]>();
    const nameMap = new Map<string, typeof activeAgents[0]>();
    
    activeAgents.forEach(agent => {
      if (agent.email) {
        emailMap.set(agent.email.toLowerCase(), agent);
      }
      const nameKey = `${agent.first_name?.toLowerCase()}_${agent.last_name?.toLowerCase()}`;
      nameMap.set(nameKey, agent);
    });

    const results = {
      created: 0,
      updated: 0,
      preserved: 0,
      softDeleted: 0,
      errors: [] as string[],
    };

    const processedAgentIds = new Set<string>();
    const importEmailSet = new Set<string>();
    const importNameSet = new Set<string>();

    // Track what's in the import for later soft-delete check
    importAgents.forEach(agent => {
      if (agent.email) importEmailSet.add(agent.email.toLowerCase());
      const nameKey = `${agent.first_name.toLowerCase()}_${agent.last_name.toLowerCase()}`;
      importNameSet.add(nameKey);
    });

    // Process each agent from import - batch insert/update for performance
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    for (const agent of importAgents) {
      const emailLower = agent.email?.toLowerCase();
      const nameKey = `${agent.first_name.toLowerCase()}_${agent.last_name.toLowerCase()}`;
      
      // Try to match by email first, then by name
      let existingAgent = emailLower ? emailMap.get(emailLower) : undefined;
      if (!existingAgent) {
        existingAgent = nameMap.get(nameKey);
      }

      if (existingAgent) {
        // Update existing agent
        processedAgentIds.add(existingAgent.id);
        toUpdate.push({
          id: existingAgent.id,
          data: {
            first_name: agent.first_name,
            last_name: agent.last_name,
            email: agent.email || existingAgent.email,
            phone: agent.phone || existingAgent.phone,
            updated_at: new Date().toISOString(),
            deleted_at: null, // Resurrect if was soft-deleted
          }
        });
      } else {
        // Insert new agent
        toInsert.push({
          first_name: agent.first_name,
          last_name: agent.last_name,
          email: agent.email,
          phone: agent.phone,
          brokerage: '', // Required field
        });
      }
    }

    // Batch updates
    console.log(`Processing ${toUpdate.length} updates...`);
    for (const item of toUpdate) {
      const { error } = await supabase
        .from('buyer_agents')
        .update(item.data)
        .eq('id', item.id);
      
      if (error) {
        results.errors.push(`Update error: ${error.message}`);
      } else {
        results.updated++;
      }
    }

    // Batch inserts (in chunks of 100)
    console.log(`Processing ${toInsert.length} inserts...`);
    const chunkSize = 100;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { data: inserted, error } = await supabase
        .from('buyer_agents')
        .insert(chunk)
        .select('id');
      
      if (error) {
        results.errors.push(`Insert batch error: ${error.message}`);
      } else {
        results.created += inserted?.length || 0;
        inserted?.forEach(a => processedAgentIds.add(a.id));
      }
    }

    // Handle agents not in import - soft delete unlinked ones
    console.log('Checking for agents to soft-delete...');
    for (const agent of activeAgents) {
      if (processedAgentIds.has(agent.id)) continue;

      // Check if this agent is in the import by email or name
      const emailLower = agent.email?.toLowerCase();
      const nameKey = `${agent.first_name?.toLowerCase()}_${agent.last_name?.toLowerCase()}`;
      const isInImport = (emailLower && importEmailSet.has(emailLower)) || importNameSet.has(nameKey);

      if (!isInImport) {
        if (linkedAgentIds.has(agent.id)) {
          // Preserve - linked to leads
          results.preserved++;
        } else {
          // Soft delete - not in import and not linked
          const { error: deleteError } = await supabase
            .from('buyer_agents')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', agent.id);

          if (deleteError) {
            results.errors.push(`Soft delete error: ${deleteError.message}`);
          } else {
            results.softDeleted++;
          }
        }
      }
    }

    console.log('Import complete:', results);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalInImport: importAgents.length,
        created: results.created,
        updated: results.updated,
        preserved: results.preserved,
        softDeleted: results.softDeleted,
        errors: results.errors.length,
      },
      errors: results.errors.slice(0, 50), // First 50 errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
