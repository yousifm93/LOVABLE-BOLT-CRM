import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AGENTS_DATA = [
  {
    first_name: 'Jonathan',
    last_name: 'Cedeno',
    email: 'Cedenosells@Luxehomes.com',
    brokerage: '',
    last_agent_call: '2025-11-06'
  },
  {
    first_name: 'Angel',
    last_name: 'Cuan',
    email: 'Angel@keyssmithgroup.com',
    brokerage: '',
    last_agent_call: '2025-11-06'
  },
  {
    first_name: 'Sonja',
    last_name: 'Cajuste',
    email: 'homeswithonja@gmail.com',
    brokerage: '',
    last_agent_call: '2025-11-04'
  },
  {
    first_name: 'Edein',
    last_name: 'Meza',
    email: 'edein.meza@compass.com',
    brokerage: '',
    last_agent_call: '2025-11-05'
  },
  {
    first_name: 'Lori',
    last_name: 'Prepsent',
    email: 'lori.prepsent@compass.com',
    brokerage: '',
    last_agent_call: '2025-11-06'
  },
  {
    first_name: 'Lori',
    last_name: 'Warriner',
    email: 'lori@teamfourcorners.com',
    brokerage: '',
    last_agent_call: '2025-11-03'
  },
  {
    first_name: 'Francois',
    last_name: 'Lopez',
    email: 'francois@bergrilli.com',
    brokerage: '',
    last_agent_call: '2025-11-10'
  },
  {
    first_name: 'Nakarid',
    last_name: 'Melean',
    email: 'nakaridmelean@gmail.com',
    brokerage: '',
    last_agent_call: '2025-11-10'
  },
  {
    first_name: 'Silvy',
    last_name: 'Souza',
    email: 'Property.miami@yahoo.com',
    brokerage: '',
    last_agent_call: '2025-11-05'
  },
  {
    first_name: 'Elisa',
    last_name: 'Da Silva',
    email: 'ceo@thebestrealtyagency.com',
    brokerage: '',
    last_agent_call: '2025-11-03'
  },
  {
    first_name: 'Julian',
    last_name: 'Acosta',
    email: 'Julian.acosta@compass.com',
    brokerage: '',
    last_agent_call: '2025-11-10'
  },
  {
    first_name: 'Matt',
    last_name: 'Edwards',
    email: null,
    brokerage: '',
    last_agent_call: '2025-11-04'
  },
  {
    first_name: 'Cinthia Pamela',
    last_name: 'Montufar',
    email: 'Cinthia.montufar@gmail.com',
    brokerage: '',
    last_agent_call: '2025-11-10'
  },
  {
    first_name: 'Kent',
    last_name: 'Campbell',
    email: 'kent.campbell@selmier.com',
    brokerage: '',
    last_agent_call: '2025-11-10'
  },
  {
    first_name: 'Benjamin',
    last_name: 'Gonzalez',
    email: 'bgrealestatepremiun@gmail.com',
    brokerage: '',
    last_agent_call: '2025-11-04'
  },
  {
    first_name: 'Peter',
    last_name: 'Green',
    email: 'pgreen@tflr.com',
    brokerage: '',
    last_agent_call: '2025-11-10'
  },
  {
    first_name: 'Gian',
    last_name: 'Peixoto',
    email: 'gianpeixoto@gmail.com',
    brokerage: '',
    last_agent_call: '2025-11-05'
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Starting to process ${AGENTS_DATA.length} agents...`);

    const results = {
      existing: [] as any[],
      created: [] as any[],
      errors: [] as any[]
    };

    for (const agent of AGENTS_DATA) {
      console.log(`Processing agent: ${agent.first_name} ${agent.last_name}`);
      
      // Check if agent exists by email or name
      let query = supabaseClient
        .from('buyer_agents')
        .select('id, first_name, last_name, email');

      if (agent.email) {
        query = query.eq('email', agent.email);
      } else {
        query = query
          .eq('first_name', agent.first_name)
          .eq('last_name', agent.last_name);
      }

      const { data: existing, error: selectError } = await query.maybeSingle();

      if (selectError) {
        console.error(`Error checking for existing agent: ${selectError.message}`);
        results.errors.push({ agent, error: selectError.message });
        continue;
      }

      if (existing) {
        // Update last_agent_call if agent exists
        console.log(`Agent exists, updating last_agent_call: ${existing.id}`);
        const { error: updateError } = await supabaseClient
          .from('buyer_agents')
          .update({ last_agent_call: agent.last_agent_call })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error(`Error updating agent: ${updateError.message}`);
          results.errors.push({ agent, error: updateError.message });
        } else {
          results.existing.push({ ...agent, id: existing.id });
        }
      } else {
        // Insert new agent
        console.log(`Creating new agent: ${agent.first_name} ${agent.last_name}`);
        const { data: newAgent, error: insertError } = await supabaseClient
          .from('buyer_agents')
          .insert([agent])
          .select()
          .single();
        
        if (insertError) {
          console.error(`Error creating agent: ${insertError.message}`);
          results.errors.push({ agent, error: insertError.message });
        } else {
          results.created.push(newAgent);
        }
      }
    }

    console.log('Processing complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
