import transporter from './mailer.js';

function welcomeEmailTemplate(userName = 'there') {
    return {
        subject: 'Welcome to Clear Tab 🎉',

        text: `
Hi ${userName},

Welcome to Clear Tab!

We're excited to have you on board. Your account has been successfully created and you can now explore all our features.

If you have any questions, just reply to this email—we’re happy to help.

Cheers,
The Clear Tab Team
    `.trim(),

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, sans-serif;">
  <div style="
    max-width:520px;
    margin:40px auto;
    background:#ffffff;
    padding:32px;
    border-radius:8px;
  ">

    <h2 style="text-align:center; margin-top:0;">Welcome to Clear Tab 🎉</h2>

    <p>Hi ${userName},</p>

    <p>
      We’re excited to have you on board! Your account has been
      <strong>successfully created</strong>.
    </p>

    <p>
      You can now access all features and start exploring what Clear Tab has to offer.
    </p>

    <div style="text-align:center; margin:30px 0;">
      <div style="
        display:inline-block;
        padding:12px 24px;
        background:#111;
        color:#fff;
        border-radius:6px;
        font-size:14px;
      ">
        Get Started
      </div>
    </div>

    <p style="font-size:14px;">
      If you have any questions, just reply to this email — we’re always happy to help.
    </p>

    <hr style="margin:30px 0;" />

    <p style="font-size:12px; color:#888; text-align:center;">
      © 2026 Clear Tab. All rights reserved.
    </p>

  </div>
</body>
</html>
    `.trim(),
    };
}
``;

export default async function sendWelcomeEmail(toEmail, userName) {
    const template = welcomeEmailTemplate(userName);

    await transporter.sendMail({
        from: `"Clear Tab" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
    });
}
