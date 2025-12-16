import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keywords that strongly indicate lender marketing
const MARKETING_KEYWORDS = [
  // Product terms
  'program overview', 'new program', 'product alert', 'rate sheet', 'pricing update',
  'guideline update', 'guideline change', 'product launch', 'new product',
  // Loan types
  'dscr', 'bank statement', 'non-qm', 'jumbo', 'va loan', 'fha loan', 'usda',
  'conventional', 'asset depletion', 'investor loan', 'rental income',
  'p&l program', 'voe program', 'itin', '12-month bank statement', '24-month bank statement',
  'va high balance', 'high balance', 'conforming', 'super conforming',
  // Features
  'ltv', 'loan-to-value', 'max ltv', 'fico', 'credit score', 'minimum credit',
  'no income', 'no doc', 'stated income', 'alternative documentation',
  'interest only', 'prepayment penalty', 'debt service coverage',
  // Marketing language
  'fund your borrowers', 'available now', 'now available', 'introducing',
  'announcing', 'hot pricing', 'special pricing', 'limited time', 'exclusive',
  'wholesale', 'broker', 'correspondent', 'yes!', 'check it out', 'great rates',
];

// Subject line patterns that indicate marketing
const MARKETING_SUBJECT_PATTERNS = [
  /program\s*(overview|alert|update|launch)/i,
  /pricing\s*(update|alert|hot|special)/i,
  /hot\s*.*pricing/i,
  /new\s*(product|program|offering)/i,
  /guideline\s*(update|change|alert)/i,
  /rate\s*sheet/i,
  /\b(dscr|non-?qm|bank\s*statement)\b/i,
  /ltv\s*up\s*to/i,
  /\bfico\s*(down\s*to|as\s*low)/i,
  /fund\s*your\s*borrowers/i,
  /alternative\s*documentation/i,
  /investor\s*(cash\s*flow|loans?)/i,
  /\b(va|fha|usda)\s*(high\s*balance|loan|jumbo)/i,
  /high\s*balance\s*pricing/i,
];

// Sender domains commonly associated with wholesale lenders
const LENDER_DOMAINS = [
  'uwm.com', 'pennymac.com', 'caliberhomeloans.com', 'flagstar.com',
  'homepoint.com', 'newrez.com', 'rfrpc.com', 'amcbank.com',
  'angeloak.com', 'acralending.com', 'deephavenmortgage.com',
  'citadelservicing.com', 'athasbank.com', 'kiavi.com', 'lima.one',
  'rfrpc.com', 'primereliance.com', 'newwave.com',
  // Common email marketing platforms used by lenders
  'constantcontact.com', 'mailchimp.com', 'hubspot.com', 'pardot.com',
];

interface LenderMarketingResult {
  isLenderMarketing: boolean;
  category: string | null;
  confidence: number;
  reason: string;
}

function detectLenderMarketing(subject: string, body: string, fromEmail: string): LenderMarketingResult {
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();
  const combinedContent = `${subjectLower} ${bodyLower}`;
  const fromDomain = fromEmail.split('@')[1]?.toLowerCase() || '';
  
  let score = 0;
  const reasons: string[] = [];
  let category: string | null = null;

  // Check subject patterns (high weight)
  for (const pattern of MARKETING_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      score += 30;
      reasons.push(`Subject matches marketing pattern: ${pattern.source}`);
      break;
    }
  }

  // Check keywords in subject (higher weight than body)
  let keywordMatches = 0;
  for (const keyword of MARKETING_KEYWORDS) {
    if (subjectLower.includes(keyword.toLowerCase())) {
      score += 15;
      keywordMatches++;
      if (keywordMatches <= 2) {
        reasons.push(`Subject contains keyword: "${keyword}"`);
      }
    }
  }

  // Check keywords in body (lower weight)
  let bodyKeywordMatches = 0;
  for (const keyword of MARKETING_KEYWORDS) {
    if (bodyLower.includes(keyword.toLowerCase()) && !subjectLower.includes(keyword.toLowerCase())) {
      score += 5;
      bodyKeywordMatches++;
      if (bodyKeywordMatches <= 2) {
        reasons.push(`Body contains keyword: "${keyword}"`);
      }
    }
  }

  // Check sender domain
  for (const domain of LENDER_DOMAINS) {
    if (fromDomain.includes(domain)) {
      score += 20;
      reasons.push(`Sender domain is known lender: ${fromDomain}`);
      break;
    }
  }

  // Determine category based on content
  if (combinedContent.includes('pricing') || combinedContent.includes('rate sheet')) {
    category = 'Pricing Update';
  } else if (combinedContent.includes('guideline') || combinedContent.includes('requirement')) {
    category = 'Guideline Change';
  } else if (combinedContent.includes('new program') || combinedContent.includes('program overview') || combinedContent.includes('introducing')) {
    category = 'New Product';
  } else if (combinedContent.includes('bank statement') || combinedContent.includes('dscr') || combinedContent.includes('non-qm')) {
    category = 'Specialty Loan';
  } else if (score > 30) {
    category = 'Product Promotion';
  }

  // Calculate confidence (0-1)
  const confidence = Math.min(score / 100, 1);
  
  return {
    isLenderMarketing: score >= 40,
    category,
    confidence,
    reason: reasons.slice(0, 3).join('; ') || 'No strong marketing indicators',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, htmlBody, fromEmail, emailLogId } = await req.json();
    
    console.log('[parse-email-lender-marketing] Analyzing email:', subject?.substring(0, 50));

    // Combine text and HTML body for analysis
    const fullBody = body || htmlBody || '';
    
    // Run detection
    const result = detectLenderMarketing(subject || '', fullBody, fromEmail || '');
    
    console.log('[parse-email-lender-marketing] Result:', {
      isLenderMarketing: result.isLenderMarketing,
      category: result.category,
      confidence: result.confidence,
      reason: result.reason,
    });

    // If emailLogId provided and it's lender marketing, update the database
    if (emailLogId && result.isLenderMarketing) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('email_logs')
        .update({
          is_lender_marketing: true,
          lender_marketing_category: result.category,
        })
        .eq('id', emailLogId);

      if (updateError) {
        console.error('[parse-email-lender-marketing] Error updating email_logs:', updateError);
      } else {
        console.log('[parse-email-lender-marketing] Updated email_logs for:', emailLogId);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[parse-email-lender-marketing] Error:', error);
    return new Response(JSON.stringify({
      isLenderMarketing: false,
      category: null,
      confidence: 0,
      reason: `Error: ${error.message}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});