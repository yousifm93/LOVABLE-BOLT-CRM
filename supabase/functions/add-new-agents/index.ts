import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AGENTS_DATA = [
  {
    first_name: 'Mariana',
    last_name: 'Ramirez',
    email: null,
    brokerage: '',
    face_to_face_meeting: '2025-11-04'
  },
  {
    first_name: 'Sebastian',
    last_name: 'Acosta',
    email: null,
    brokerage: '',
    face_to_face_meeting: '2025-11-10'
  },
  {
    first_name: 'Suzana',
    last_name: 'Moura',
    email: null,
    brokerage: '',
    face_to_face_meeting: '2025-11-10'
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
        // Update face_to_face_meeting if agent exists
        console.log(`Agent exists, updating face_to_face_meeting: ${existing.id}`);
        const { error: updateError } = await supabaseClient
          .from('buyer_agents')
          .update({ face_to_face_meeting: agent.face_to_face_meeting })
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
