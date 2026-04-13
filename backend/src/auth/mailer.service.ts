import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private mode(): 'log' | 'smtp' {
    const raw = (
      this.config.get<string>('AUTH_EMAIL_MODE') ?? 'log'
    ).toLowerCase();
    return raw === 'smtp' ? 'smtp' : 'log';
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host) {
      throw new Error('SMTP_HOST is required when AUTH_EMAIL_MODE=smtp');
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.config.get<string>('SMTP_SECURE') === '1',
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
    });
    return this.transporter;
  }

  async send(params: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    if (this.mode() === 'log') {
      this.logger.warn(
        `[AUTH_EMAIL_MODE=log] to=${params.to} subject=${params.subject}\n${params.text}`,
      );
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'noreply@localhost';
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
  }
}
