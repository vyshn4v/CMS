import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  from?: string | null;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifies SMTP environment variables and creates a Nodemailer transporter.
   * Throws an explicit error if required SMTP variables are missing.
   */
  private getTransporter(): nodemailer.Transporter {
    const host = this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const portStr = this.configService.get<string>('SMTP_PORT') || process.env.SMTP_PORT;
    const user = this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass = this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS;
    const secureVal = this.configService.get<string>('SMTP_SECURE') || process.env.SMTP_SECURE;

    if (!host || !user || !pass) {
      throw new BadRequestException(
        'SMTP configuration missing in environment variables. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.',
      );
    }

    const port = portStr ? parseInt(portStr, 10) : 587;
    const secure = secureVal === 'true' || port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Sends an email via SMTP. Throws error if send fails or SMTP is unconfigured.
   */
  async sendEmail(options: SendMailOptions): Promise<{ messageId: string }> {
    const from =
      (options.from && options.from.trim()) ||
      this.configService.get<string>('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      'CMS Notifications <noreply@cms.local>';

    const transporter = this.getTransporter();

    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        cc: options.cc || undefined,
        bcc: options.bcc || undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email successfully delivered to "${options.to}" (Message ID: ${info.messageId})`);
      return { messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send email to "${options.to}": ${err.message}`, err.stack);
      throw err;
    }
  }
}
