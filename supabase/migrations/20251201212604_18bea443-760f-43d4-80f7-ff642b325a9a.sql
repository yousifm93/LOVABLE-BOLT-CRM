-- Update email signatures for all 4 team members with Supabase-hosted images only

-- Yousif Mohamed
UPDATE public.users
SET email_signature = '
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      <td style="padding-right: 20px; vertical-align: top;">
        <img src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/YM%20circle%20headshot.JPG" alt="Yousif Mohamed" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
      </td>
      <td style="vertical-align: top;">
        <div style="margin-bottom: 15px;">
          <strong style="font-size: 18px; color: #1a1a1a;">YOUSIF MOHAMED</strong><br>
          <span style="font-size: 14px; color: #666;">Senior Loan Officer</span><br>
          <span style="font-size: 12px; color: #888;">NMLS #1390971</span><br>
          <strong style="font-size: 16px; color: #0066cc;">Mortgage Bolt</strong>
        </div>
        <div style="font-size: 13px; line-height: 1.6;">
          <div>📞 <a href="tel:+13523289828" style="color: #333; text-decoration: none;">(352) 328-9828</a></div>
          <div>📍 848 Brickell Avenue, Suite 840, Miami, FL 33131</div>
          <div>🌐 <a href="https://MortgageBolt.com/apply" style="color: #0066cc; text-decoration: none;">MortgageBolt.com/apply</a></div>
        </div>
        <div style="margin-top: 15px;">
          <a href="https://MortgageBolt.com/apply" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">📅 Schedule a Call</a>
        </div>
      </td>
    </tr>
  </table>
  <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999;">
    <p>This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error please notify the system manager.</p>
  </div>
</div>
'
WHERE email = 'yousif@mortgagebolt.org';

-- Salma Mohamed
UPDATE public.users
SET email_signature = '
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      <td style="padding-right: 20px; vertical-align: top;">
        <img src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/sal%20circle%20headshot.JPG" alt="Salma Mohamed" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
      </td>
      <td style="vertical-align: top;">
        <div style="margin-bottom: 15px;">
          <strong style="font-size: 18px; color: #1a1a1a;">SALMA MOHAMED</strong><br>
          <span style="font-size: 14px; color: #666;">Loan Officer</span><br>
          <span style="font-size: 12px; color: #888;">NMLS #2471657</span><br>
          <strong style="font-size: 16px; color: #0066cc;">Mortgage Bolt</strong>
        </div>
        <div style="font-size: 13px; line-height: 1.6;">
          <div>📞 <a href="tel:+13522132980" style="color: #333; text-decoration: none;">(352) 213-2980</a></div>
          <div>📍 848 Brickell Avenue, Suite 840, Miami, FL 33131</div>
          <div>🌐 <a href="https://MortgageBolt.com/apply" style="color: #0066cc; text-decoration: none;">MortgageBolt.com/apply</a></div>
        </div>
        <div style="margin-top: 15px;">
          <a href="https://MortgageBolt.com/apply" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">📅 Schedule a Call</a>
        </div>
      </td>
    </tr>
  </table>
  <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999;">
    <p>This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error please notify the system manager.</p>
  </div>
</div>
'
WHERE email = 'Salma@mortgagebolt.org';

-- Herman Daza
UPDATE public.users
SET email_signature = '
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      <td style="padding-right: 20px; vertical-align: top;">
        <img src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/HD%20headshot.JPG" alt="Herman Daza" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
      </td>
      <td style="vertical-align: top;">
        <div style="margin-bottom: 15px;">
          <strong style="font-size: 18px; color: #1a1a1a;">HERMAN DAZA, MBA</strong><br>
          <span style="font-size: 14px; color: #666;">Pre-Approval Expert</span><br>
          <span style="font-size: 12px; color: #888;">NMLS #2602145</span><br>
          <strong style="font-size: 16px; color: #0066cc;">Mortgage Bolt</strong>
        </div>
        <div style="font-size: 13px; line-height: 1.6;">
          <div>📞 <a href="tel:+13056190386" style="color: #333; text-decoration: none;">(305) 619-0386</a></div>
          <div>📍 848 Brickell Avenue, Suite 840, Miami, FL 33131</div>
          <div>🌐 <a href="https://MortgageBolt.com/apply" style="color: #0066cc; text-decoration: none;">MortgageBolt.com/apply</a></div>
        </div>
        <div style="margin-top: 15px;">
          <a href="https://MortgageBolt.com/apply" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">📅 Schedule a Call</a>
        </div>
      </td>
    </tr>
  </table>
  <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999;">
    <p>This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error please notify the system manager.</p>
  </div>
</div>
'
WHERE email = 'Herman@mortgagebolt.org';

-- Juan Diego
UPDATE public.users
SET email_signature = '
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      <td style="padding-right: 20px; vertical-align: top;">
        <img src="https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/JD%20headshot.JPG" alt="Juan Diego" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
      </td>
      <td style="vertical-align: top;">
        <div style="margin-bottom: 15px;">
          <strong style="font-size: 18px; color: #1a1a1a;">JUAN DIEGO</strong><br>
          <span style="font-size: 14px; color: #666;">Loan Officer Assistant</span><br>
          <span style="font-size: 12px; color: #888;">NMLS #2602145</span><br>
          <strong style="font-size: 16px; color: #0066cc;">Mortgage Bolt</strong>
        </div>
        <div style="font-size: 13px; line-height: 1.6;">
          <div>📞 <a href="tel:+13056197592" style="color: #333; text-decoration: none;">(305) 619-7592</a></div>
          <div>📍 848 Brickell Avenue, Suite 840, Miami, FL 33131</div>
          <div>🌐 <a href="https://MortgageBolt.com/apply" style="color: #0066cc; text-decoration: none;">MortgageBolt.com/apply</a></div>
        </div>
        <div style="margin-top: 15px;">
          <a href="https://MortgageBolt.com/apply" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">📅 Schedule a Call</a>
        </div>
      </td>
    </tr>
  </table>
  <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999;">
    <p>This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error please notify the system manager.</p>
  </div>
</div>
'
WHERE email = 'Juan@mortgagebolt.org';