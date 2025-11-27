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
    const { image, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing lead screenshot with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing a screenshot from a mortgage business. This could be an email or text message about a potential lead. Extract the following information and return it as JSON:

{
  "first_name": "borrower's first name if found",
  "last_name": "borrower's last name if found",
  "phone": "phone number in format (XXX) XXX-XXXX if found",
  "email": "email address if found",
  "agent_name": "real estate agent's name if mentioned (full name)",
  "referral_method": "Email" or "Text Message" or "Other" based on screenshot type,
  "referral_source": "who referred this lead (agent name, company, person)",
  "notes": "summarize what the lead is looking for, property details, timeline, any important context",
  "confidence": a number between 0 and 1 indicating confidence in the extraction
}

Important:
- For borrower name, look for phrases like "client looking", "buyer named", or introductions
- For agent name, look for signatures, "from:", real estate company names, agent titles
- For referral_method, determine if this is an email screenshot (headers, subject lines) or text message (SMS bubbles, messaging app)
- For referral_source, identify who is referring the lead (could be the agent, a friend, company)
- For notes, extract property requirements (price range, bedrooms, location), timeline (when they want to buy), loan type preferences, or any special circumstances
- Return null for any field you cannot confidently extract
- Be conservative with confidence scores - only return >0.8 if you're very certain`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${image}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    const extractedData = JSON.parse(jsonStr.trim());
    console.log('Extracted data:', extractedData);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-lead-image:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      first_name: null,
      last_name: null,
      phone: null,
      email: null,
      agent_name: null,
      referral_method: null,
      referral_source: null,
      notes: null,
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
