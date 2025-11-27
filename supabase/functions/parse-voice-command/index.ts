import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, currentFormData } = await req.json();
    
    if (!transcription) {
      throw new Error('No transcription provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create a detailed prompt for the AI to interpret voice commands
    const systemPrompt = `You are an AI assistant that interprets voice commands to update lead form fields.

The user is creating a new lead and may want to update these fields:
- first_name: First name of the lead
- last_name: Last name of the lead
- phone: Phone number
- email: Email address
- buyer_agent_name: Real estate agent's name (will be matched against agent list)
- referred_via: MUST be one of: "Email", "Text Message", "Phone Call", "Social Media", "Website", "Other"
- source: MUST be one of: "Agent", "Past Client", "Zillow", "Realtor.com", "Other"
- notes: Additional notes about the lead

Current form data:
${JSON.stringify(currentFormData, null, 2)}

Interpret the voice command and extract field updates. Return ONLY valid JSON in this exact format:
{
  "updates": {
    "field_name": "new_value"
  },
  "action": "update"
}

CRITICAL RULES FOR referred_via AND source:
- referred_via can ONLY be: "Email", "Text Message", "Phone Call", "Social Media", "Website", or "Other"
- source can ONLY be: "Agent", "Past Client", "Zillow", "Realtor.com", or "Other"
- For buyer_agent_name, extract just the agent's name, it will be matched against the agent list

If the user wants to ADD to notes (not replace), use action: "append_notes".
If updating existing fields, use action: "update".

Examples:
- "Put the phone number as 352-555-1234" → {"updates": {"phone": "352-555-1234"}, "action": "update"}
- "The email should be john@example.com" → {"updates": {"email": "john@example.com"}, "action": "update"}
- "Change last name to Smith" → {"updates": {"last_name": "Smith"}, "action": "update"}
- "The realtor is Kevin Rutto" → {"updates": {"buyer_agent_name": "Kevin Rutto"}, "action": "update"}
- "Real estate agent is John Doe" → {"updates": {"buyer_agent_name": "John Doe"}, "action": "update"}
- "Add a note that they want a condo in Miami" → {"updates": {"notes": "Looking for a condo in Miami"}, "action": "append_notes"}
- "Referral method is text message" → {"updates": {"referred_via": "Text Message"}, "action": "update"}
- "This came from an agent" → {"updates": {"source": "Agent"}, "action": "update"}

Only return valid JSON. Do not include any explanation or markdown.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcription }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to interpret voice command');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the AI response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in parse-voice-command:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        updates: {}
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
