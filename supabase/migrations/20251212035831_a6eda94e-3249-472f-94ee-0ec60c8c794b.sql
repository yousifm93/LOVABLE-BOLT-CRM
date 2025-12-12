-- Create email automation settings table for test mode configuration
CREATE TABLE IF NOT EXISTS public.email_automation_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_mode_enabled boolean NOT NULL DEFAULT true,
  test_borrower_email text NOT NULL DEFAULT 'mbborrower@gmail.com',
  test_buyer_agent_email text NOT NULL DEFAULT 'mbbuyersagent@gmail.com',
  test_listing_agent_email text NOT NULL DEFAULT 'mblistingagent@gmail.com',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_automation_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for settings
CREATE POLICY "Admins can manage email automation settings"
  ON public.email_automation_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'Admin'::user_role
  ));

CREATE POLICY "Authenticated users can view email automation settings"
  ON public.email_automation_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default settings row
INSERT INTO public.email_automation_settings (test_mode_enabled)
VALUES (true);

-- Create the 3 Bottleneck Breaker email templates with escaped quotes
INSERT INTO public.email_templates (name, html, version)
VALUES 
(
  'ACTION REQUIRED: Your Loan Documents are Ready',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<p>Hi <strong>{{first_name}}</strong>,</p>\n\n<p>We just ordered your "Initial Disclosure Package." This is the official start of the loan process!</p>\n\n<p>You will receive a secure email from <strong>{{lender_name}}</strong> (or sometimes "MyLoanDocs") within the next 24 hours.</p>\n\n<p><strong>Two very important things:</strong></p>\n<ol>\n<li><strong>Check your Spam/Promotions folder.</strong> If you don\'t see it by end of day, let me know.</li>\n<li><strong>Don\'t panic about the numbers.</strong> These are <em>initial estimates</em> required by federal law. We will be refining these with the title company to get them exact before closing.</li>\n</ol>\n\n<p>Please take a minute to e-sign these as soon as they arrive so we don\'t delay submitting your file to underwriting.</p>\n</div>',
  1
),
(
  'GREAT NEWS: You are Conditionally Approved!',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<p>Hi <strong>{{first_name}}</strong>,</p>\n\n<p>Congratulations! I am excited to let you know that our underwriter has officially <strong>Approved</strong> your loan!</p>\n\n<p><strong>What does "Conditionally Approved" mean?</strong></p>\n<p>It means the hard part is over. The underwriter has signed off on your income, assets, and credit. Now, we just need to clear a few final administrative "conditions" (paperwork items) to get to the finish line.</p>\n\n<p><strong>What happens next?</strong></p>\n<p>My processor will be reaching out within 24 hours to collect these final items. Please keep an eye out for their call or email so we can get this wrapped up quickly.</p>\n\n<p>You are almost there!</p>\n</div>',
  1
),
(
  'CLEAR TO CLOSE: We are ready for the finish line!',
  E'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<p><strong>{{first_name}}</strong>,</p>\n\n<p>I am thrilled to tell you that your loan is <strong>Clear to Close (CTC)!</strong></p>\n\n<p>This means the underwriter has signed off on everything, and we are ready to prepare your final loan documents.</p>\n\n<p><strong>Next Steps:</strong></p>\n<ul>\n<li><strong>Closing Disclosure (CD):</strong> If you haven\'t already, you will sign a final CD shortly confirming your final numbers.</li>\n<li><strong>Cash to Close:</strong> We will be working with the title company to get you the exact amount needed for closing.</li>\n<li><strong>IMPORTANT - WIRE FRAUD WARNING:</strong> Do not wire any funds until you have verbally confirmed the instructions with the Title Company. We will never email you wire instructions directly.</li>\n</ul>\n\n<p>We are scheduled to close on <strong>{{close_date}}</strong>.</p>\n\n<p>The team and I are so excited for you!</p>\n</div>',
  1
);

-- Create the 3 email automations linking to the templates
DO $$
DECLARE
  starter_gun_id uuid;
  deep_breath_id uuid;
  finish_line_id uuid;
BEGIN
  SELECT id INTO starter_gun_id FROM email_templates WHERE name = 'ACTION REQUIRED: Your Loan Documents are Ready' LIMIT 1;
  SELECT id INTO deep_breath_id FROM email_templates WHERE name = 'GREAT NEWS: You are Conditionally Approved!' LIMIT 1;
  SELECT id INTO finish_line_id FROM email_templates WHERE name = 'CLEAR TO CLOSE: We are ready for the finish line!' LIMIT 1;
  
  INSERT INTO public.email_automations (name, trigger_type, trigger_config, pipeline_group, recipient_type, purpose, template_id, is_active)
  VALUES 
  (
    'Starter Gun - Initial Disclosures',
    'status_changed',
    '{"field": "disclosure_status", "target_status": "Ordered"}'::jsonb,
    'active',
    'borrower',
    'Sent when disclosures are ordered - tells borrower to check email and not panic about estimates',
    starter_gun_id,
    true
  ),
  (
    'Deep Breath - Conditional Approval',
    'status_changed',
    '{"field": "loan_status", "target_status": "AWC"}'::jsonb,
    'active',
    'borrower',
    'Sent when loan is conditionally approved (AWC) - calms anxiety and validates the deal',
    deep_breath_id,
    true
  ),
  (
    'Finish Line - Clear to Close',
    'status_changed',
    '{"field": "loan_status", "target_status": "CTC"}'::jsonb,
    'active',
    'borrower',
    'Sent when loan is CTC - coordinates final closing logistics and wire fraud warning',
    finish_line_id,
    true
  );
END $$;

-- Add updated_at trigger for email_automation_settings
CREATE OR REPLACE FUNCTION public.update_email_automation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_email_automation_settings_updated_at
  BEFORE UPDATE ON public.email_automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_automation_settings_updated_at();