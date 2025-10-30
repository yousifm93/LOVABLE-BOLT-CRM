import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = 'https://yousifmo93.app.n8n.cloud/webhook/chatbot-query';
const TIMEOUT_MS = 30000; // 30 seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new Error('Invalid or empty message');
    }

    console.log('Processing guideline query via N8N:', message.substring(0, 100));

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Call N8N webhook with the query
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8N webhook error:', response.status, errorText);
        throw new Error(`N8N webhook returned status ${response.status}`);
      }

      const data = await response.json();
      console.log('N8N response received:', JSON.stringify(data).substring(0, 200));

      // Extract the answer from N8N response
      // Trying multiple possible response field names
      const assistantMessage = data.response || data.answer || data.output || data.result ||
        'I apologize, but I could not generate a response. Please try again.';

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
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - the guideline search took too long');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in guideline-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
