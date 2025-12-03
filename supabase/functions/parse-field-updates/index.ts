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
    const { transcription, currentLeadData } = await req.json();
    
    if (!transcription) {
      return new Response(
        JSON.stringify({ error: 'No transcription provided', detectedUpdates: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', detectedUpdates: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an assistant that analyzes voice transcriptions from mortgage loan officers to detect field update requests for their CRM leads.

Analyze the transcription and extract any field update requests. Only extract updates that are clearly stated - do not infer or guess.

Available fields that can be updated (use exact field names):
- appraisal_eta (date, format: YYYY-MM-DD)
- appraisal_status (values: Not Ordered, Ordered, Scheduled, Completed, Received, Review, Revision)
- appraisal_value (number)
- title_eta (date, format: YYYY-MM-DD)
- title_status (values: Not Ordered, Ordered, In Process, Received)
- condo_eta (date, format: YYYY-MM-DD)
- condo_status (values: Not Ordered, Ordered, In Process, Received, N/A)
- insurance_eta (date, format: YYYY-MM-DD)
- hoi_status (values: Not Quoted, Quoted, Received)
- loan_status (values: NEW, RFP, SUB, COND, CTC, DOCS, FUNDED, Suspended)
- disclosure_status (values: Not Sent, Sent, Signed)
- close_date (date, format: YYYY-MM-DD)
- lock_expiration_date (date, format: YYYY-MM-DD)
- loan_amount (number)
- sales_price (number)
- interest_rate (percentage number, e.g., 6.5)
- cd_status (values: Not Ordered, Requested, Received, Sent, Signed, N/A)
- ba_status (values: Pending, Approved, Rejected, N/A)
- package_status (values: Not Started, In Progress, Review, Final, Shipped)
- epo_status (values: Not Started, In Review, Approved, Rejected)

Current lead data for context:
${JSON.stringify(currentLeadData, null, 2)}

Return a JSON array of detected updates. Each update should have:
- field: the exact field name from the list above
- fieldLabel: a human-readable label for the field
- currentValue: the current value from the lead data (or null if not set)
- newValue: the new value to set (properly formatted)

Only return updates where the user clearly intends to change a field value. If no field updates are detected, return an empty array.

IMPORTANT: Return ONLY the JSON array, no other text.`;

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
          { role: 'user', content: `Transcription: "${transcription}"` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI processing failed', detectedUpdates: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response content:', content);

    // Parse the JSON response
    let detectedUpdates = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();
      
      detectedUpdates = JSON.parse(cleanedContent);
      
      if (!Array.isArray(detectedUpdates)) {
        detectedUpdates = [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', content);
      detectedUpdates = [];
    }

    console.log('Detected updates:', detectedUpdates);

    return new Response(
      JSON.stringify({ detectedUpdates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-field-updates:', error);
    return new Response(
      JSON.stringify({ error: error.message, detectedUpdates: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
