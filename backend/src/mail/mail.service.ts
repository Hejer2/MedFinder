import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter | null = null;

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // If we have custom SMTP configurations, use them
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        console.log('📬 MailService: Initialized using custom SMTP config.');
        return;
      }

      // Default fallback: Create a dynamic Ethereal test inbox (real-time visual testing inbox)
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`📬 MailService: Initialized using dynamic Ethereal testing account (${testAccount.user}).`);
    } catch (err: any) {
      console.error('MailService initialization failed:', err.message);
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      console.warn('MailService transporter is not initialized, logging mail to console:');
      console.log(`To: ${to}\nSubject: ${subject}\nBody:\n${html}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: '"MedFinder" <no-reply@medfinder.com>',
        to,
        subject,
        html,
      });

      console.log(`📧 Email sent successfully to: ${to} (Subject: ${subject})`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Preview Ethereal Email Inbox here: ${previewUrl}`);
      }
      return info;
    } catch (err: any) {
      console.error(`Failed to send email to ${to}:`, err.message);
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${frontendUrl}/verify-email/${token}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f766e;">Welcome to MedFinder, ${name}!</h2>
        <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
        <div style="margin: 30px 0;">
          <a href="${url}" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this URL into your browser: <br/> <a href="${url}">${url}</a></p>
      </div>
    `;
    return this.sendMail(to, 'Verify your email address - MedFinder', html);
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${frontendUrl}/reset-password/${token}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f766e;">Reset your password - MedFinder</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${url}" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;
    return this.sendMail(to, 'Reset your password - MedFinder', html);
  }
}
