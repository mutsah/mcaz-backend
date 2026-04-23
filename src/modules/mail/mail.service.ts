import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtp(to: string, otp: string, firstName: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM');

    await this.transporter.sendMail({
      from: `"MCAZ - Medicines Control Authority of Zimbabwe" <${from}>`,
      to,
      subject: 'Your MCAZ Verification Code',
      text: `Hi ${firstName},\n\nYour verification code is: ${otp}\n\nIt expires in 10 minutes. Do not share it.\n\nMCAZ - Medicines Control Authority of Zimbabwe`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px">
          <h2 style="color:#4A90E2;margin-bottom:8px">MCAZ - Medicines Control Authority of Zimbabwe</h2>
          <p style="color:#374151">Hi <strong>${firstName}</strong>,</p>
          <p style="color:#374151">Use the verification code below to complete your registration:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;text-align:center;padding:24px 0">${otp}</div>
          <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Never share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <p style="color:#9ca3af;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`OTP email sent to ${to}`);
  }
}
