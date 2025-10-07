import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { message } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Processing guideline query:', message);

    // Call OpenAI Assistants API with your agent configuration
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a senior mortgage underwriter and product expert. Your role is to answer questions about lender guidelines, loan programs, products, and pricing by searching the vector store of uploaded lender guidelines.

Always:
- Retrieve the most relevant passages from the vector store.
- Provide a clear, accurate, and compliant answer as if advising a loan officer.
- Include specific conditions, eligibility requirements, or overlays when available.
- If the answer is not explicitly supported in the guidelines, say so and avoid speculation.
- Prioritize precision and completeness over brevity.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        tools: [
          {
            type: 'file_search'
          }
        ],
        tool_choice: 'auto',
        max_tokens: 1500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    console.log('Generated response successfully');

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in guideline-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
