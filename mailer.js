const nodemailer = require('nodemailer');

let testTransporter = null;

/**
 * Get or initialize nodemailer transporter
 */
async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to official Ethereal test account for seamless local testing
  if (!testTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
  return testTransporter;
}

/**
 * Generate HTML Certificate for the email
 */
function generateCertificateHtml(student, certData) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Certificate of Consistency</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 30px; margin: 0;">
    <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 8px solid #1e293b; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
      
      <!-- Top Ribbon -->
      <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
      <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 3px; font-weight: 800; color: #64748b; margin-bottom: 5px;">
        Student Notebook Achievement System
      </div>
      <h1 style="font-size: 28px; font-weight: 900; color: #1e293b; margin: 0 0 15px 0;">
        CERTIFICATE OF CONSISTENCY
      </h1>
      <div style="width: 80px; height: 3px; background: #ea580c; margin: 0 auto 25px auto;"></div>

      <p style="font-size: 16px; color: #475569; margin-bottom: 10px;">
        This certificate of academic discipline and focus is proudly awarded to:
      </p>

      <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 5px; font-family: 'Georgia', serif;">
        ${student.displayName || student.username}
      </div>
      <div style="font-size: 14px; color: #64748b; font-weight: 600; margin-bottom: 25px;">
        ${student.grade || 'General Scholar'} • ${student.email || 'Registered Student'}
      </div>

      <p style="font-size: 15px; color: #334155; line-height: 1.6; max-width: 520px; margin: 0 auto 25px auto;">
        For demonstrating exceptional consistency, discipline, and daily commitment to academic growth by maintaining a 
        <strong>${student.currentStreak || 1}-day active To-Do streak</strong> and completing 
        <strong>${student.pomodoro?.totalSessions || 0} Pomodoro study focus sessions</strong> (${Math.round((student.pomodoro?.totalMinutes || 0)/60 * 10)/10} hours).
      </p>

      <!-- Stats Grid in Email -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background: #fff7ed; border-radius: 12px; border: 1px solid #fed7aa;">
        <tr>
          <td style="padding: 15px; text-align: center; border-right: 1px solid #fed7aa;">
            <div style="font-size: 12px; text-transform: uppercase; color: #9a3412; font-weight: 700;">Daily To-Do Streak</div>
            <div style="font-size: 22px; font-weight: 900; color: #c2410c;">🔥 ${student.currentStreak || 0} Days</div>
          </td>
          <td style="padding: 15px; text-align: center; border-right: 1px solid #fed7aa;">
            <div style="font-size: 12px; text-transform: uppercase; color: #9a3412; font-weight: 700;">Pomodoro Streak</div>
            <div style="font-size: 22px; font-weight: 900; color: #c2410c;">🍅 ${student.pomodoro?.currentStreak || 0} Days</div>
          </td>
          <td style="padding: 15px; text-align: center;">
            <div style="font-size: 12px; text-transform: uppercase; color: #9a3412; font-weight: 700;">Total Focus Time</div>
            <div style="font-size: 22px; font-weight: 900; color: #c2410c;">⏱️ ${student.pomodoro?.totalMinutes || 0}m</div>
          </td>
        </tr>
      </table>

      <!-- Verification details -->
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between;">
        <div>Certificate ID: <strong>${certData.id}</strong></div>
        <div>Award Date: <strong>${new Date().toLocaleDateString()}</strong></div>
      </div>

      <div style="margin-top: 25px;">
        <span style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-weight: 700; font-size: 14px;">
          Keep Up The Incredible Momentum! 🚀
        </span>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Send the Weekly Consistency Certificate email to student
 */
async function sendConsistencyCertificate(student, certData) {
  try {
    const transporter = await getTransporter();
    const targetEmail = student.email || `${student.username}@studentnotebook.local`;

    const htmlContent = generateCertificateHtml(student, certData);

    const info = await transporter.sendMail({
      from: '"Student Notebook & Habits" <no-reply@studentnotebook.edu>',
      to: targetEmail,
      subject: `🏆 Certificate of Consistency Awarded - ${student.displayName} (Week ${certData.weekNumber})`,
      text: `Congratulations ${student.displayName}! You have been awarded the Weekly Certificate of Consistency for maintaining a ${student.currentStreak}-day streak and ${student.pomodoro?.totalSessions || 0} Pomodoro focus sessions. Certificate ID: ${certData.id}`,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log(`[Email Sent] Message ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[Email Preview URL]: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      recipient: targetEmail
    };
  } catch (err) {
    console.error('Error sending certificate email:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  sendConsistencyCertificate,
  generateCertificateHtml
};
