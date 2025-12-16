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
    const { file_url } = await req.json();

    if (!file_url) {
      throw new Error('file_url is required');
    }

    console.log('Downloading file from:', file_url);

    // Download the file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error('Failed to download file');
    }

    const fileBlob = await fileResponse.blob();
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('File converted to base64, length:', base64.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call AI to extract conditions from the document
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert mortgage document parser. Extract ALL conditions from this Initial Approval Letter.

For each condition, categorize it into one of these types:
- credit: Credit-related conditions (credit reports, pay offs, mortgage history)
- title: Title-related conditions (title work, settlement statements, deed)
- income: Income-related conditions (tax returns, paystubs, W-2s, bank statements, self-employment)
- property: Property-related conditions (appraisal, surveys, permits)
- insurance: Insurance-related conditions (HOI, flood, liability)
- borrower: Borrower-related conditions (ID, immigration, divorce, child support)
- submission: Submission/closing conditions
- other: Anything that doesn't fit above

Also identify the phase each condition belongs to:
- CTC (Clear to Close): Required before Clear to Close
- Prior to Close: Must be completed before closing
- Funding: Required for funding
- Post Closing: Required after closing

Return ONLY valid JSON in this exact format:
{
  "conditions": [
    {
      "category": "credit|title|income|property|insurance|borrower|submission|other",
      "description": "Full exact text of the condition",
      "underwriter": "Name of the underwriter who added this (if visible)",
      "phase": "CTC|Prior to Close|Funding|Post Closing"
    }
  ],
  "loan_info": {
    "lender": "Lender name",
    "note_rate": 6.625,
    "loan_amount": 862500,
    "term": 360,
    "approved_date": "2025-12-15"
  }
}

IMPORTANT:
- Extract EVERY single condition, do not skip any
- Keep the full description text exactly as written
- If underwriter is not shown, use "Unknown"
- Default phase to "CTC" if not clear`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all conditions from this Initial Approval Letter. Return the complete JSON with all conditions.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let extractedData;
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('Extracted conditions count:', extractedData.conditions?.length || 0);

    return new Response(JSON.stringify({
      success: true,
      conditions: extractedData.conditions || [],
      loan_info: extractedData.loan_info || {},
      extracted_data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-initial-approval:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
