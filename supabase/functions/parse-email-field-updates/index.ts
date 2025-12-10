import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Field definitions with display names and valid values
const FIELD_DEFINITIONS = {
  loan_status: {
    displayName: 'Loan Status',
    type: 'select',
    validValues: ['New', 'RFP', 'SUB', 'AWC', 'CTC', 'CLOSED', 'Needs Support'],
  },
  appraisal_status: {
    displayName: 'Appraisal Status',
    type: 'select',
    validValues: ['ORDERED', 'SCHEDULED', 'INSPECTED', 'RECEIVED', 'WAIVER', 'TRANSFER'],
  },
  title_status: {
    displayName: 'Title Status',
    type: 'select',
    validValues: ['ORDERED', 'RECEIVED', 'CLEARED'],
  },
  hoi_status: {
    displayName: 'Insurance Status',
    type: 'select',
    validValues: ['QUOTED', 'ORDERED', 'BOUND'],
  },
  condo_status: {
    displayName: 'Condo Status',
    type: 'select',
    validValues: ['ORDERED', 'RECEIVED', 'APPROVED', 'WAIVED'],
  },
  disclosure_status: {
    displayName: 'Disclosure Status',
    type: 'select',
    validValues: ['Not Started', 'Sent', 'Signed'],
  },
  cd_status: {
    displayName: 'CD Status',
    type: 'select',
    validValues: ['Not Started', 'Sent', 'Signed'],
  },
  package_status: {
    displayName: 'Package Status',
    type: 'select',
    validValues: ['Not Started', 'In Progress', 'Completed'],
  },
  epo_status: {
    displayName: 'EPO Status',
    type: 'select',
    validValues: ['Not Started', 'Sent'],
  },
  interest_rate: {
    displayName: 'Interest Rate',
    type: 'number',
  },
  lock_expiration_date: {
    displayName: 'Lock Expiration Date',
    type: 'date',
  },
  close_date: {
    displayName: 'Closing Date',
    type: 'date',
  },
  discount_points: {
    displayName: 'Discount Points',
    type: 'number',
  },
  loan_amount: {
    displayName: 'Loan Amount',
    type: 'currency',
  },
  sales_price: {
    displayName: 'Sales Price',
    type: 'currency',
  },
  appraisal_value: {
    displayName: 'Appraisal Value',
    type: 'currency',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, htmlBody, leadId, currentLeadData } = await req.json();
    
    if (!subject && !body) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[parse-email-field-updates] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ suggestions: [], error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build field list for AI prompt
    const fieldList = Object.entries(FIELD_DEFINITIONS).map(([key, def]) => {
      let fieldDesc = `- ${key} (${def.displayName}): ${def.type}`;
      if ('validValues' in def && def.validValues) {
        fieldDesc += ` - valid values: ${def.validValues.join(', ')}`;
      }
      return fieldDesc;
    }).join('\n');

    // Build current values context
    const currentValuesContext = currentLeadData ? Object.entries(currentLeadData)
      .filter(([key]) => key in FIELD_DEFINITIONS)
      .map(([key, value]) => `${key}: ${value || 'null'}`)
      .join('\n') : 'No current data available';

    const systemPrompt = `You are an AI assistant that analyzes mortgage-related emails to detect status updates and field changes for a CRM system.

Your task is to identify any information in the email that suggests a CRM field should be updated.

AVAILABLE CRM FIELDS:
${fieldList}

CURRENT LEAD VALUES:
${currentValuesContext}

INSTRUCTIONS:
1. Analyze the email subject and body for any status updates or field changes
2. Look for phrases like "clear to close", "CTC", "appraisal received", "rate locked", "closing date confirmed", etc.
3. Only suggest changes that are CLEARLY indicated in the email
4. For dates, use YYYY-MM-DD format
5. For numbers/currency, use plain numbers (no $ or % symbols)
6. Be conservative - only suggest updates you're confident about
7. Don't suggest changes if the current value already matches what the email indicates

Return a JSON array of suggestions. Each suggestion should have:
- field_name: the database field name
- field_display_name: human-readable name
- suggested_value: the new value to set
- reason: brief explanation of why (1-2 sentences)
- confidence: number 0.0-1.0

Example response:
[
  {
    "field_name": "loan_status",
    "field_display_name": "Loan Status",
    "suggested_value": "CTC",
    "reason": "Email indicates the loan has been cleared to close.",
    "confidence": 0.95
  }
]

If no updates are detected, return an empty array: []`;

    const userPrompt = `Subject: ${subject || '(no subject)'}

Email Body:
${body || htmlBody || '(no content)'}

Analyze this email and identify any CRM field updates that should be made.`;

    console.log('[parse-email-field-updates] Analyzing email for field updates...');

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
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-email-field-updates] AI Gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ suggestions: [], error: 'AI Gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    console.log('[parse-email-field-updates] AI response:', content);

    // Parse the JSON response
    let suggestions = [];
    try {
      // Clean up potential markdown formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanContent);
      
      // Validate suggestions
      suggestions = suggestions.filter((s: any) => {
        return s.field_name && 
               s.suggested_value && 
               s.reason &&
               s.field_name in FIELD_DEFINITIONS;
      });

      // Add display names if missing
      suggestions = suggestions.map((s: any) => ({
        ...s,
        field_display_name: s.field_display_name || FIELD_DEFINITIONS[s.field_name as keyof typeof FIELD_DEFINITIONS]?.displayName || s.field_name,
        confidence: s.confidence || 0.8,
      }));

    } catch (parseError) {
      console.error('[parse-email-field-updates] Error parsing AI response:', parseError);
      suggestions = [];
    }

    console.log('[parse-email-field-updates] Detected suggestions:', suggestions.length);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[parse-email-field-updates] Error:', error);
    return new Response(JSON.stringify({ suggestions: [], error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
