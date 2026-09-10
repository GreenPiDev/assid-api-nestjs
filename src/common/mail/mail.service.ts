import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { emailButton, renderEmailTemplate } from './templates/base-email.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    // Same Zimbra mailbox password for both accounts; only the sending
    // address switches with the environment (mirrors the storage service's
    // dev/production folder split), so nothing extra needs to be set per
    // deployment beyond NODE_ENV and the shared SMTP_PASS.
    const defaultUser = isProduction ? 'support@greenpiworks.com' : 'developer@greenpiworks.com';
    const user = this.config.get<string>('SMTP_USER') ?? defaultUser;

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'mail.greenpiworks.com',
      port,
      // 465 = implicit TLS from the start; anything else (587, 25...) uses
      // plaintext with an opportunistic STARTTLS upgrade, which is what the
      // Zimbra panel means by "SSL: Yok" on port 587.
      secure: port === 465,
      auth: {
        user,
        pass: this.config.get<string>('SMTP_PASS'),
      },
      // The shared Zimbra host presents a wildcard cert for *.ihszimbra.com
      // instead of mail.greenpiworks.com, so strict hostname verification
      // fails even though the connection itself is legitimate. Relaxing it
      // here (not globally) is the standard workaround for shared hosting.
      tls: { rejectUnauthorized: false },
    });
    this.from = this.config.get<string>('MAIL_FROM') ?? `ASSİD <${user}>`;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const html = renderEmailTemplate(`
      <h2 style="margin-bottom:8px">Şifre Sıfırlama</h2>
      <p>Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsiniz. Bu bağlantı 1 saat boyunca geçerlidir.</p>
      ${emailButton(resetUrl, 'Şifremi Sıfırla')}
      <p style="color:#62707d;font-size:0.85rem">Bu talebi siz oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
    `);
    await this.sendMail(to, 'ASSİD - Şifre Sıfırlama Talebi', html);
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      this.logger.error(`Failed to send email "${subject}" to ${to}`, error as Error);
      throw error;
    }
  }
}
