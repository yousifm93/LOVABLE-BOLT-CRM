UPDATE public.email_templates
SET html = '<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
  <p>Hi {{first_name}},</p>
  
  <p>I hope you''re doing well.</p>
  
  <p>Congratulations! Your profile looks great, and you are <span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: bold;">PRE-QUALIFIED</span> for the following terms:</p>
  
  <ul style="margin: 16px 0; padding-left: 20px;">
    <li><strong>Purchase Price:</strong> {{sales_price}}</li>
    <li><strong>Down Payment:</strong> ${{down_pmt}}</li>
    <li><strong>Loan Amount:</strong> {{loan_amount}}</li>
  </ul>
  
  <p>Please keep in mind this is not your maximum approval. Once we complete document review, we''ll be able to finalize numbers more precisely.</p>
  
  <p>This pre-qualification is based on the information provided in your loan application, positioning you strongly as you move forward.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  
  <p><strong>What''s Next?</strong></p>
  
  <ol style="margin: 16px 0; padding-left: 20px;">
    <li style="margin-bottom: 12px;"><strong>Book a Quick Call with Our Team</strong> – Let''s connect to review your options, answer questions, and discuss next steps. Choose a time <a href="https://calendly.com/yousif-mortgage/pa" style="color: #2563eb; text-decoration: underline;">HERE</a></li>
    <li style="margin-bottom: 12px;"><strong>Complete Credit Authorization</strong> – Please complete the credit authorization via this link: <a href="https://credit.advcredit.com/smartpay/SmartPay.aspx?uid=6b0276d4-7fae-412b-a82f-54ad11aad331#forward" style="color: #2563eb; text-decoration: underline;">HERE</a></li>
    <li style="margin-bottom: 12px;"><strong>Work with Your Agent</strong> – Connect with {{buyer_agent_first_name}} to begin your property search. We''ll coordinate with them to strategize on your behalf.</li>
    <li style="margin-bottom: 12px;"><strong>Keep Us Updated</strong> – If anything changes along the way, let us know. We''re here to ensure a smooth and seamless experience.</li>
  </ol>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  
  <p>Let us know how we can assist - we''re excited to help you get into your new home!</p>
  
  <p>Best,</p>
</div>',
    version = version + 1,
    updated_at = now()
WHERE name = 'Loan Pre-Qualification';