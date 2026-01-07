import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedTask {
  title: string;
  description: string | null;
  due_date: string | null;
  assignee_name: string | null;
  borrower_name: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, users, leads } = await req.json();

    if (!transcript) {
      throw new Error('Transcript is required');
    }

    console.log('Parsing voice command for task creation:', transcript);
    console.log('Available users:', users?.length || 0);
    console.log('Available leads:', leads?.length || 0);

    // Build context about available users and leads
    const userNames = users?.map((u: any) => `${u.first_name} ${u.last_name}`.trim()).join(', ') || 'None provided';
    const leadNames = leads?.map((l: any) => `${l.first_name} ${l.last_name}`.trim()).slice(0, 50).join(', ') || 'None provided';

    const systemPrompt = `You are a task creation assistant. Parse the user's voice command and extract task details.

Available team members who can be assigned tasks: ${userNames}
Available borrowers/leads: ${leadNames}

Today's date is ${new Date().toISOString().split('T')[0]}.

Extract the following from the user's voice command:
1. Task title - a concise title for the task
2. Description - any additional details (optional)
3. Due date - if mentioned (like "tomorrow", "next week", "Friday", etc.), convert to YYYY-MM-DD format
4. Assignee name - match to one of the available team members if mentioned
5. Borrower name - match to one of the available borrowers/leads if mentioned

Return ONLY a valid JSON object with this exact structure:
{
  "title": "string - the task title",
  "description": "string or null - additional details",
  "due_date": "YYYY-MM-DD or null - the due date",
  "assignee_name": "string or null - matched team member name",
  "borrower_name": "string or null - matched borrower/lead name"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);

    // Parse the JSON response
    let parsedTask: ParsedTask;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedTask = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Create a basic task from the transcript
      parsedTask = {
        title: transcript.slice(0, 100),
        description: null,
        due_date: null,
        assignee_name: null,
        borrower_name: null,
      };
    }

    console.log('Parsed task:', parsedTask);

    return new Response(JSON.stringify(parsedTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-voice-task function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
