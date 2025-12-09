import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, htmlBody } = await req.json();

    if (!subject && !body && !htmlBody) {
      return new Response(JSON.stringify({ error: 'No email content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[Summarize Email] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use plain text body, fall back to stripping HTML
    let emailContent = body || '';
    if (!emailContent && htmlBody) {
      // Basic HTML tag stripping
      emailContent = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Truncate content if too long
    const maxContentLength = 2000;
    const truncatedContent = emailContent.length > maxContentLength 
      ? emailContent.substring(0, maxContentLength) + '...'
      : emailContent;

    const prompt = `Summarize this email in exactly 10-15 words. Focus on the main action or purpose. Be concise and direct.

Subject: ${subject || '(No Subject)'}

Email content:
${truncatedContent}

Summary:`;

    console.log('[Summarize Email] Calling Lovable AI Gateway');

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
            role: 'system', 
            content: 'You are a concise email summarizer. Generate summaries in 10-15 words that capture the main action or purpose of the email. Examples: "Requesting appraisal scheduling confirmation for property", "Notifying borrower of clear to close status", "Asking about loan document requirements", "Confirming closing date and time details".'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Summarize Email] AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || null;

    console.log('[Summarize Email] Generated summary:', summary);

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Summarize Email] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
