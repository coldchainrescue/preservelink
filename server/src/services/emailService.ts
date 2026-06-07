import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter;

if (env.DEMO_MODE || !env.SMTP_USER) {
  // Demo mode: log emails to console
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
} else {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export const emailService = {
  async send2FACode(email: string, code: string) {
    const mailOptions = {
      from: `"PreserveLink" <${env.SMTP_USER || 'noreply@preservelink.gov.my'}>`,
      to: email,
      subject: 'PreserveLink - Your Verification Code',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">PreserveLink Verification</h2>
          <p>Your 2FA verification code is:</p>
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e40af;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">PreserveLink - Cold Chain Stability Tool<br/>Ministry of Health Malaysia</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    if (env.DEMO_MODE) {
      console.log(`[EMAIL - 2FA Code] To: ${email}, Code: ${code}`);
    }
    return result;
  },

  async sendNotification(email: string, subject: string, message: string) {
    const mailOptions = {
      from: `"PreserveLink" <${env.SMTP_USER || 'noreply@preservelink.gov.my'}>`,
      to: email,
      subject: `PreserveLink - ${subject}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">PreserveLink</h2>
          <p>${message}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">PreserveLink - Cold Chain Stability Tool<br/>Ministry of Health Malaysia</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    if (env.DEMO_MODE) {
      console.log(`[EMAIL - Notification] To: ${email}, Subject: ${subject}`);
    }
    return result;
  },

  async sendAdminAlert(subject: string, message: string) {
    return this.sendNotification(env.TRUE_ADMIN_EMAIL, subject, message);
  },

  async sendPasswordResetEmail(email: string, resetLink: string) {
    const mailOptions = {
      from: `"PreserveLink" <${env.SMTP_USER || 'noreply@preservelink.gov.my'}>`,
      to: email,
      subject: 'PreserveLink - Password Reset Request',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">Password Reset Request</h2>
          <p>We received a request to reset the password for your PreserveLink account.</p>
          <p>Click the button below to set a new password. This link will expire in <strong>5 minutes</strong> for security reasons.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Reset My Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #1e40af; font-size: 13px; word-break: break-all;">${resetLink}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            If you did not request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
          <p style="color: #94a3b8; font-size: 12px;">PreserveLink - Cold Chain Stability Tool<br/>Ministry of Health Malaysia</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    if (env.DEMO_MODE) {
      console.log(`[EMAIL - Password Reset] To: ${email}, Link: ${resetLink}`);
    }
    return result;
  },
};
