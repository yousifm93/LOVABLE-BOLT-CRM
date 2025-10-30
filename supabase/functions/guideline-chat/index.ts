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
          query: message,
          message,
          text: message,
          prompt: message,
          question: message
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8N webhook error:', response.status, errorText);
        throw new Error(`N8N webhook returned status ${response.status}`);
      }

      // Get response as text first to handle both JSON and plain text responses
      const responseText = await response.text();
      console.log('N8N raw response:', responseText.substring(0, 500));

      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        console.warn('N8N returned an empty response body; using fallback message');
        const assistantMessage = 'I could not get a response from the guideline service. Please try again.';
        return new Response(
          JSON.stringify({ response: assistantMessage, success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Try to parse as JSON, if it fails treat as plain text
      let data;
      let assistantMessage;
      
      try {
        data = JSON.parse(responseText);
        console.log('N8N response parsed as JSON:', JSON.stringify(data).substring(0, 200));
        
        // Extract the answer from N8N response - trying multiple possible field names
        assistantMessage = data.response || data.answer || data.output || data.result || data.message || null;
        
        // If no known field found, use the entire responseText
        if (!assistantMessage) {
          console.log('No known field found in JSON response, using raw text');
          assistantMessage = responseText;
        }
      } catch (parseError) {
        // N8N returned plain text instead of JSON
        console.log('N8N response is plain text, not JSON:', parseError.message);
        assistantMessage = responseText;
      }

      // Final fallback
      if (!assistantMessage || assistantMessage.trim() === '') {
        assistantMessage = 'I apologize, but I could not generate a response. Please try again.';
      }

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
