import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url } = await req.json();

    if (!file_url) {
      throw new Error('file_url is required');
    }

    console.log('Downloading AUS file from:', file_url);

    // Download the file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error('Failed to download file');
    }

    const fileBlob = await fileResponse.blob();
    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    console.log('File converted to base64, length:', base64.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call AI to extract conditions from the AUS Findings document
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
            content: `You are a mortgage processing assistant. You will receive an AUS Findings document (Desktop Underwriter DU or Freddie Mac LPA/Loan Product Advisor).

TASK:
1) Read the AUS Findings document.
2) Extract ONLY the required "conditions / documentation / verifications" that must be obtained, validated, or documented to close and/or to satisfy AUS findings.
3) Convert them into a structured list with a concise NAME and detailed DESCRIPTION.

For each requirement, categorize it into one of these types:
- credit: Credit-related conditions (credit reports, disputes, mortgage history)
- title: Title-related conditions (title work, settlement statements, deed)
- income: Income/Employment conditions (tax returns, paystubs, W-2s, VOE, 1099s, self-employment)
- property: Property/Appraisal conditions (appraisal requirements, inspections, address validation)
- insurance: Insurance-related conditions (HOI, flood, liability)
- borrower: Assets/Funds/Borrower docs (bank statements, VODs, large deposits, gift docs, earnest money, ID)
- other: Everything else

EXTRACTION RULES:
- For each condition, provide a concise NAME (5-10 words max) that summarizes the requirement
- Also provide a full DESCRIPTION with the complete condition text
- ONLY include items that require action/documentation
- Do NOT include general commentary like "follow guidelines" unless it clearly implies a concrete document or action
- Do NOT include internal AUS metadata (casefile ID, score, ratios, loan limits, messages) unless it creates a condition requiring documentation
- If the document mentions that a condition is NOT required (e.g., "no further action is necessary"), do NOT list it
- If the AUS indicates documentation is needed only IF a scenario applies, include it as conditional wording
- Remove duplicates. Keep items unique and consolidated.

WHAT TO INCLUDE (EXAMPLES):
- Income/Employment: VOE, paystubs, W-2s, tax returns, business returns, 1099s, cash flow analysis (Form 1084)
- Assets/Funds to Close: bank statements/VODs, large deposit sourcing, gift documentation, earnest money sourcing, liquidation proof, brokerage statements
- Liabilities/Credit: documentation supporting omitted liabilities, payoff statements if marked paid at closing, dispute requirements ONLY if AUS requires action
- Property/Appraisal: appraisal type required, property inspection, address validation requirements, special appraisal credential requirements
- Closing/Timing: credit docs age requirements, re-verification timing requirements if stated as a required action

Return ONLY valid JSON in this exact format:
{
  "conditions": [
    {
      "category": "income|credit|property|borrower|insurance|title|other",
      "name": "Short concise name (5-10 words max)",
      "description": "Full detailed condition text explaining what is needed",
      "phase": "AUS"
    }
  ],
  "aus_info": {
    "decision": "Approve/Eligible or Approve/Ineligible or other",
    "case_id": "Case file ID if visible",
    "risk_class": "Risk classification if visible"
  }
}

IMPORTANT:
- If you cannot find any explicit conditions, return: { "conditions": [], "aus_info": {} }
- If the AUS is "Approve/Ineligible" due only to agency loan limit / non-deliverable reason, still extract the conditions list from the findings (do not stop)
- Default phase to "AUS" for all conditions`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all conditions/documentation requirements from this AUS Findings document. Return the complete JSON with all conditions.'
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
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
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

    console.log('Extracted AUS conditions count:', extractedData.conditions?.length || 0);

    return new Response(JSON.stringify({
      success: true,
      conditions: extractedData.conditions || [],
      aus_info: extractedData.aus_info || {},
      extracted_data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-aus-approval:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
