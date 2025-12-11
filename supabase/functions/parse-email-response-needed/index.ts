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
    const { subject, body, htmlBody, fromEmail, direction, leadName } = await req.json();
    
    if (!subject && !body && !htmlBody) {
      return new Response(
        JSON.stringify({ needsResponse: false, reason: 'No email content provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip outbound emails - they don't need responses
    if (direction === 'Out') {
      return new Response(
        JSON.stringify({ needsResponse: false, reason: 'Outbound email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ needsResponse: false, reason: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email content for analysis
    const emailContent = body || htmlBody?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    const truncatedContent = emailContent.substring(0, 4000);

    const systemPrompt = `You are an AI assistant that analyzes mortgage loan emails to determine if they require a human response.

Your task is to analyze the email and determine:
1. Does this email require someone (like a loan officer) to respond?
2. Why does it need a response (or why not)?
3. How urgent is the response needed? (low, medium, high)
4. How confident are you in this assessment? (0-1)

Emails that typically NEED a response:
- Questions from borrowers, agents, or other parties
- Requests for information or documents
- Complaints or concerns that need addressing
- Time-sensitive matters (closing dates, rate locks, deadlines)
- Emails asking for clarification or next steps
- Client emails expressing confusion or needing guidance

Emails that typically DON'T need a response:
- Automated system notifications (rate lock confirmations, status updates)
- Receipt confirmations
- Generic marketing emails
- CC emails where someone else is the primary recipient
- Purely informational updates with no questions
- Internal team communications that are FYI only

Return a JSON object with this exact structure:
{
  "needsResponse": boolean,
  "reason": "Brief explanation of why this email does or doesn't need a response",
  "urgency": "low" | "medium" | "high",
  "confidence": number (0-1)
}`;

    const userPrompt = `Analyze this email to determine if it needs a human response:

From: ${fromEmail}
Subject: ${subject}
Lead/Borrower: ${leadName || 'Unknown'}

Email Content:
${truncatedContent}

Determine if this email requires someone to respond and provide your analysis as JSON.`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', needsResponse: false }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ needsResponse: false, reason: 'AI analysis failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response for response-needed analysis:', aiContent);

    // Parse the JSON response
    let result = {
      needsResponse: false,
      reason: 'Unable to analyze email',
      urgency: 'low' as 'low' | 'medium' | 'high',
      confidence: 0.5
    };

    try {
      // Extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          needsResponse: Boolean(parsed.needsResponse),
          reason: String(parsed.reason || ''),
          urgency: ['low', 'medium', 'high'].includes(parsed.urgency) ? parsed.urgency : 'low',
          confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-email-response-needed:', error);
    return new Response(
      JSON.stringify({ error: error.message, needsResponse: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});