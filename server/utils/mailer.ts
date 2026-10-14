import nodemailer from "nodemailer";

/**
 * Send an OTP email using standard SMTP.
 * Works completely free using a standard Gmail account + App Password.
 */
export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const user = process.env.SMTP_EMAIL || "your-email@gmail.com";
  const pass = process.env.SMTP_PASSWORD || "your-app-password";

  if (!process.env.SMTP_EMAIL) {
    console.warn("[MAILER] SMTP_EMAIL is not set in .env. Skipping real email delivery.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const mailOptions = {
      from: `"NIfty50GPT Security" <${user}>`,
      to: toEmail,
      subject: "Your NIfty50GPT Login Code",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">NIfty50GPT Login</h2>
          <p>Hello,</p>
          <p>You requested a one-time password to log into your account. Please use the following 6-digit code:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${otpCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 5 minutes. If you did not request this, please safely ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] OTP email sent successfully to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[MAILER] Error sending email:", error);
    return false;
  }
}

export interface FeedbackEmailPayload {
  feedbackType: string;
  rating?: number;
  userEmail: string;
  subject: string;
  message: string;
  userId?: string;
}

/**
 * Send user feedback to the admin/support email via SMTP.
 */
export async function sendFeedbackEmail(payload: FeedbackEmailPayload): Promise<{ success: boolean; message?: string }> {
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;
  const receiver = process.env.FEEDBACK_RECEIVER_EMAIL || user;

  if (!user || !pass) {
    console.warn("[MAILER] SMTP_EMAIL or SMTP_PASSWORD is not set in .env. Skipping real email delivery.");
    return { success: false, message: "SMTP credentials not configured in server environment." };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const categoryBadge = (payload.feedbackType || "GENERAL").toUpperCase();
    const stars = payload.rating ? "★".repeat(payload.rating) + "☆".repeat(Math.max(0, 5 - payload.rating)) : "N/A";

    const mailOptions = {
      from: `"NIfty50GPT Feedback" <${user}>`,
      to: receiver,
      replyTo: payload.userEmail,
      subject: `[Feedback: ${categoryBadge}] ${payload.subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff; color: #1e293b;">
          <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 14px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px;">New Nifty50GPT User Feedback</h2>
            <span style="display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; letter-spacing: 0.5px;">
              CATEGORY: ${categoryBadge}
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 120px;"><strong>From:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;"><a href="mailto:${payload.userEmail}" style="color: #2563eb; text-decoration: none;">${payload.userEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Rating:</strong></td>
              <td style="padding: 6px 0; color: #f59e0b; font-size: 15px;">${stars} (${payload.rating ?? "N/A"}/5)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${payload.subject}</td>
            </tr>
            ${payload.userId ? `<tr><td style="padding: 6px 0; color: #64748b;"><strong>User ID:</strong></td><td style="padding: 6px 0; color: #0f172a;">${payload.userId}</td></tr>` : ''}
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; text-transform: uppercase;">User Message:</h4>
            <p style="margin: 0; color: #1e293b; white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${payload.message}</p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            Received automatically from the Nifty50GPT Help & Feedback Center · Reply directly to this email to reply to the user.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Feedback email dispatched successfully to ${receiver}: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[MAILER] Error sending feedback email:", error);
    return { success: false, message: error.message };
  }
}

