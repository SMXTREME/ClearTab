import transporter from './mailer.js';

function otpEmailTemplate(otp) {
    return {
        subject: 'Your OTP Code',
        text: `
Your Clear Tab verification code is:

${otp}

This code is valid for 10 minutes.

If you did not request this OTP, please ignore this email.
    `.trim(),

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
  <div style="max-width:480px; margin:auto; background:#ffffff; padding:30px; border-radius:8px;">
    
    <h2 style="text-align:center; margin-top:0;">Clear Tab</h2>

    <p>Hello,</p>

    <p>
      Use the One-Time Password (OTP) below to complete your verification.
      This OTP is valid for <strong>10 minutes</strong>.
    </p>

    <div style="
      text-align:center;
      font-size:24px;
      font-weight:bold;
      letter-spacing:4px;
      margin:30px 0;
      background:#f1f3f5;
      padding:15px;
      border-radius:6px;
    ">
      ${otp}
    </div>

    <p>If you did not request this code, please ignore this email.</p>

    <hr style="margin:30px 0;" />

    <p style="font-size:12px; color:#888; text-align:center;">
      © 2026 Clear Tab
    </p>

  </div>
</body>
</html>
    `.trim(),
    };
}

export default async function sendOtpEmail(toEmail, otp) {
    const template = otpEmailTemplate(otp);

    const response = await transporter.sendMail({
        from: `"Clear Tab" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
    });

    return response;
}
