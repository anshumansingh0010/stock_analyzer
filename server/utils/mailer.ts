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
      from: `"Stock Sense Security" <${user}>`,
      to: toEmail,
      subject: "Your Stock Sense Login Code",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">Stock Sense Login</h2>
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
