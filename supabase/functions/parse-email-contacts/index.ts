import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailContent {
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  date: string;
}

interface ExtractedContact {
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  suggested_tags: string[] | null;
  reason: string;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { emailLogId, emailContent } = await req.json() as {
      emailLogId: string;
      emailContent: EmailContent;
    };

    if (!emailLogId || !emailContent) {
      return new Response(
        JSON.stringify({ error: 'emailLogId and emailContent are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing email for contacts:', emailContent.subject);

    // Check if we already have suggestions for this email
    const { data: existingSuggestions, error: existingError } = await supabaseClient
      .from('email_contact_suggestions')
      .select('id')
      .eq('email_log_id', emailLogId)
      .limit(1);

    if (!existingError && existingSuggestions && existingSuggestions.length > 0) {
      console.log('Suggestions already exist for this email, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Suggestions already exist', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use OpenAI to extract contacts
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

const systemPrompt = `You are an expert at extracting contact information from emails for a mortgage company CRM.
Your task is to identify any contacts mentioned in the email that could be potential new business contacts.

Look for:
1. People mentioned by name with email addresses or phone numbers
2. Email signatures with contact details
3. References to colleagues, partners, or clients
4. CC'd recipients who might be relevant contacts

For each contact found, extract:
- first_name (required)
- last_name (optional but preferred)
- email (required - must be a valid email address)
- phone (optional - format as found)
- company (IMPORTANT - always try to extract this from:
  - Email signature (most reliable)
  - Email domain (e.g., "kristina@advcredit.com" → "Advantage Credit", "amy@harvestcref.com" → "Harvest CREF")
  - Context in the email body
  - Common mortgage industry companies: title companies, credit bureaus, insurance, appraisers, etc.)
- suggested_tags (REQUIRED - always suggest 2-3 relevant tags based on their role/company. Examples:
  - Credit companies: ["Credit Vendor", "Credit Report"]
  - Banks/Lenders: ["Banker", "Wholesale Lender"]
  - Title companies: ["Title", "Escrow", "Closing"]
  - Insurance: ["Insurance", "Homeowners Insurance"]
  - Appraisers: ["Appraiser", "Property Value"]
  - Transaction coordinators: ["TC", "Transaction Coordinator"]
  - Real estate attorneys: ["Attorney", "Legal"]
  - Mortgage professionals: ["Mortgage", "Loan Officer"]
  - Real estate agents: ["Real Estate Agent", "Realtor"])
- reason (brief explanation of why this contact is relevant)
- confidence (0-100, how confident you are this is a valid business contact)

DO NOT extract:
- The sender themselves (they're already known)
- Generic company emails (info@, support@, noreply@)
- Automated system emails
- Contacts without a clear email address

Return a JSON object with a "contacts" array. If no contacts are found, return {"contacts": []}.`;

    const userPrompt = `Extract contacts from this email:

From: ${emailContent.from} <${emailContent.fromEmail}>
Subject: ${emailContent.subject}
Date: ${emailContent.date}

Body:
${emailContent.body?.substring(0, 4000) || '(no body)'}

Remember: Do NOT include the sender (${emailContent.fromEmail}) in the results.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process with OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.log('No content from OpenAI');
      return new Response(
        JSON.stringify({ success: true, count: 0, contacts: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedContent: { contacts?: ExtractedContact[] };
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      return new Response(
        JSON.stringify({ success: true, count: 0, contacts: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contacts = parsedContent.contacts || [];
    console.log(`Extracted ${contacts.length} contacts`);

    // Domain to company mapping for fallback
    const domainToCompany: Record<string, string> = {
      'admortgage.com': 'AD Mortgage',
      'advcredit.com': 'Advantage Credit',
      'harvestcref.com': 'Harvest CREF',
      'gtlaw.com': 'Greenberg Traurig',
      'lopezlawfl.com': 'Lopez Law FL',
      'relatedgroup.com': 'Related Group',
      'ammprocessingllc.com': 'AMM Processing LLC',
      'uwm.com': 'United Wholesale Mortgage',
      'rfrancismortgage.com': 'R Francis Mortgage',
      'freedommortgage.com': 'Freedom Mortgage',
      'fairwaymc.com': 'Fairway Independent Mortgage',
    };

    // Domain to tags mapping for fallback
    const domainToTags: Record<string, string[]> = {
      'admortgage.com': ['Mortgage', 'Wholesale Lender'],
      'advcredit.com': ['Credit Vendor', 'Credit Report'],
      'harvestcref.com': ['Banker', 'Commercial'],
      'gtlaw.com': ['Attorney', 'Legal'],
      'lopezlawfl.com': ['Attorney', 'Legal', 'Title'],
      'relatedgroup.com': ['Developer', 'Real Estate'],
      'ammprocessingllc.com': ['Processing', 'Mortgage'],
      'uwm.com': ['Mortgage', 'Wholesale Lender'],
    };

    // Filter out contacts that already exist and apply fallbacks
    const validContacts: ExtractedContact[] = [];
    for (const contact of contacts) {
      if (!contact.email || !contact.first_name) continue;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.email)) continue;

      // Skip sender's email
      if (contact.email.toLowerCase() === emailContent.fromEmail.toLowerCase()) continue;

      // Extract domain for fallback logic
      const emailDomain = contact.email.split('@')[1]?.toLowerCase();

      // Fallback: derive company from email domain if not extracted
      if (!contact.company && emailDomain) {
        if (domainToCompany[emailDomain]) {
          contact.company = domainToCompany[emailDomain];
        } else {
          // Generate company name from domain (e.g., "example.com" -> "Example")
          const domainParts = emailDomain.split('.');
          if (domainParts.length > 0) {
            const baseDomain = domainParts[0].replace(/[^a-zA-Z]/g, ' ').trim();
            contact.company = baseDomain.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
        }
      }

      // Fallback: add default tags if not extracted
      if (!contact.suggested_tags || contact.suggested_tags.length === 0) {
        if (emailDomain && domainToTags[emailDomain]) {
          contact.suggested_tags = domainToTags[emailDomain];
        } else {
          contact.suggested_tags = ['Contact'];
        }
      }

      // Check if contact already exists in contacts table
      const { data: existingContact } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('email', contact.email.toLowerCase())
        .limit(1);

      if (existingContact && existingContact.length > 0) {
        console.log(`Contact ${contact.email} already exists, skipping`);
        continue;
      }

      // Check if there's already a pending suggestion for this email
      const { data: existingSuggestion } = await supabaseClient
        .from('email_contact_suggestions')
        .select('id')
        .eq('email', contact.email.toLowerCase())
        .eq('status', 'pending')
        .limit(1);

      if (existingSuggestion && existingSuggestion.length > 0) {
        console.log(`Pending suggestion for ${contact.email} already exists, skipping`);
        continue;
      }

      validContacts.push(contact);
    }

    console.log(`${validContacts.length} valid new contacts to suggest`);

    // Insert suggestions
    if (validContacts.length > 0) {
      // Parse the email date - handle display strings like "3:07 PM" gracefully
      let parsedEmailDate: string | null = null;
      if (emailContent.date) {
        const parsed = new Date(emailContent.date);
        if (!isNaN(parsed.getTime())) {
          parsedEmailDate = parsed.toISOString();
        } else {
          // If we can't parse the date, use current time as fallback
          parsedEmailDate = new Date().toISOString();
          console.log(`Could not parse email date "${emailContent.date}", using current time`);
        }
      }

      const suggestionsToInsert = validContacts.map(contact => ({
        email_log_id: emailLogId,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email.toLowerCase(),
        phone: contact.phone,
        company: contact.company,
        suggested_tags: contact.suggested_tags,
        source_email_subject: emailContent.subject,
        source_email_from: emailContent.fromEmail,
        source_email_date: parsedEmailDate,
        status: 'pending',
        reason: contact.reason,
        confidence: contact.confidence
      }));

      const { error: insertError } = await supabaseClient
        .from('email_contact_suggestions')
        .insert(suggestionsToInsert);

      if (insertError) {
        console.error('Error inserting suggestions:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save suggestions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: validContacts.length,
        contacts: validContacts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-email-contacts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});