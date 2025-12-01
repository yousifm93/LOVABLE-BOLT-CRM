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
    const { prompt, currentContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert email copywriter for Mortgage Bolt, a mortgage lending company. 
    
Company Context:
- Company: Mortgage Bolt
- Team: Yousif Mohamed (Senior Loan Officer), Salma Mohamed (Loan Officer), Herman Daza (Operations Manager)
- Office: 848 Brickell Avenue, Suite 840, Miami, Florida 33131

Available Merge Tags (use these in your emails):
- {{first_name}} - Recipient's first name
- {{last_name}} - Recipient's last name
- {{email}} - Recipient's email
- {{phone}} - Recipient's phone
- {{loan_amount}} - Loan amount
- {{interest_rate}} - Interest rate
- {{close_date}} - Closing date
- {{property_address}} - Property address
- {{loan_officer}} - Assigned loan officer name
- {{company_name}} - Mortgage Bolt

Your task is to generate professional, engaging email content in HTML format. Use proper HTML tags like <p>, <strong>, <em>, <ul>, <li>, <h2>, etc. Include relevant merge tags where appropriate. Keep tone professional but friendly.`;

    const userPrompt = currentContent 
      ? `Current email content:\n${currentContent}\n\nRefinement instructions: ${prompt}`
      : `Create an email template with the following requirements: ${prompt}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated");
    }

    return new Response(JSON.stringify({ content: generatedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-email-template error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
