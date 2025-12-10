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
        JSON.stringify({ error: 'No transcription provided', detectedUpdates: [], taskSuggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', detectedUpdates: [], taskSuggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current date for natural language date parsing
    const currentDate = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are an assistant that analyzes voice transcriptions from mortgage loan officers to detect:
1. Field update requests for their CRM leads
2. Task creation requests

Current date is: ${currentDate}

Analyze the transcription and extract any field update requests AND task creation requests. Only extract items that are clearly stated - do not infer or guess.

## FIELD UPDATES

IMPORTANT - CALCULATIONS:
- If user mentions a purchase price/sales price AND a down payment percentage, calculate BOTH:
  - sales_price: the full purchase price
  - loan_amount: calculated as sales_price * (1 - down_payment_percentage/100)
  - Example: "400,000 with 20% down" → sales_price: 400000, loan_amount: 320000
- If user mentions "400K" or "400 thousand", convert to 400000

IMPORTANT - DATE PARSING:
- Parse natural language dates relative to current date (${currentDate})
- "next Sunday" or "this Sunday" → calculate the actual date
- "December 14th" or "12/14" → use current year unless context suggests otherwise
- Always return dates in YYYY-MM-DD format

Available fields that can be updated (use exact field names):
- sales_price (number) - also called "purchase price", "asking price", "price"
- loan_amount (number) - calculated if down payment % given
- down_pmt (string) - down payment amount or percentage
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
- lock_expiration_date (date, format: YYYY-MM-DD) - also called "lock expiration", "rate lock expiration"
- loan_amount (number)
- sales_price (number)
- interest_rate (percentage number, e.g., 6.5)
- cd_status (values: Not Ordered, Requested, Received, Sent, Signed, N/A)
- ba_status (values: Pending, Approved, Rejected, N/A)
- package_status (values: Not Started, In Progress, Review, Final, Shipped)
- epo_status (values: Not Started, In Review, Approved, Rejected)
- property_type (values: Single Family, Condo, Townhouse, Multi-Family, Other)
- occupancy (values: Primary Residence, Second Home, Investment)
- loan_program (values: Conventional, FHA, VA, USDA, DSCR, Non-QM, Jumbo, Other) - also called "loan type"
- dscr_ratio (number between 0-2, e.g., 1.0, 1.25)
- fico_score (number) - also called "credit score"

## TASK SUGGESTIONS

Detect when the user mentions creating a task, follow-up, reminder, or to-do item. Look for phrases like:
- "create a task to..."
- "we need to follow up on..."
- "remind me to..."
- "make sure to..."
- "I need to..."
- "task for..."
- "follow up with..."
- "schedule a call to..."
- "need to call..."
- "check on..."

For task suggestions, extract:
- title: A clear, concise task title
- description: Additional context if provided (optional)
- dueDate: If a specific date/time is mentioned (format: YYYY-MM-DD)
- priority: low, medium, or high based on urgency words (default: medium)

Current lead data for context:
${JSON.stringify(currentLeadData, null, 2)}

Return a JSON object with two arrays:
1. "detectedUpdates": Array of field updates
2. "taskSuggestions": Array of task suggestions

Each field update should have:
- field: the exact field name from the list above
- fieldLabel: a human-readable label for the field
- currentValue: the current value from the lead data (or null if not set)
- newValue: the new value to set (properly formatted)

Each task suggestion should have:
- title: string (required)
- description: string (optional, can be empty)
- dueDate: string in YYYY-MM-DD format (optional, can be null)
- priority: "low" | "medium" | "high" (default to "medium")

EXAMPLES:
Input: "The borrower is looking to purchase around 400,000 with 20% down"
Output:
{
  "detectedUpdates": [
    {"field": "sales_price", "fieldLabel": "Sales Price", "currentValue": null, "newValue": 400000},
    {"field": "loan_amount", "fieldLabel": "Loan Amount", "currentValue": null, "newValue": 320000}
  ],
  "taskSuggestions": []
}

Input: "We need to create a task to follow up on the appraisal by next Friday"
Output:
{
  "detectedUpdates": [],
  "taskSuggestions": [
    {"title": "Follow up on appraisal", "description": "", "dueDate": "2024-12-20", "priority": "medium"}
  ]
}

Input: "Appraisal came back at 425,000 and we need to call the buyer's agent tomorrow to discuss"
Output:
{
  "detectedUpdates": [
    {"field": "appraisal_value", "fieldLabel": "Appraisal Value", "currentValue": null, "newValue": 425000},
    {"field": "appraisal_status", "fieldLabel": "Appraisal Status", "currentValue": null, "newValue": "Received"}
  ],
  "taskSuggestions": [
    {"title": "Call buyer's agent to discuss appraisal", "description": "Appraisal came back at $425,000", "dueDate": "2024-12-11", "priority": "high"}
  ]
}

If no field updates or tasks are detected, return empty arrays.

IMPORTANT: Return ONLY the JSON object, no other text.`;

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
        JSON.stringify({ error: 'AI processing failed', detectedUpdates: [], taskSuggestions: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    console.log('AI response content:', content);

    // Parse the JSON response
    let result = { detectedUpdates: [], taskSuggestions: [] };
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
      
      const parsed = JSON.parse(cleanedContent);
      
      // Handle both old format (array) and new format (object with arrays)
      if (Array.isArray(parsed)) {
        result.detectedUpdates = parsed;
      } else {
        result.detectedUpdates = Array.isArray(parsed.detectedUpdates) ? parsed.detectedUpdates : [];
        result.taskSuggestions = Array.isArray(parsed.taskSuggestions) ? parsed.taskSuggestions : [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Content:', content);
    }

    console.log('Detected updates:', result.detectedUpdates);
    console.log('Task suggestions:', result.taskSuggestions);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-field-updates:', error);
    return new Response(
      JSON.stringify({ error: error.message, detectedUpdates: [], taskSuggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
