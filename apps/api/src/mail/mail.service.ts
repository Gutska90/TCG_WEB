import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const from = this.config.get<string>("EMAIL_FROM") ?? "TCG Platform <noreply@localhost>";
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    if (apiKey) {
      await this.sendResend(apiKey, from, message);
      return;
    }

    const smtpHost = this.config.get<string>("SMTP_HOST")?.trim();
    if (smtpHost) {
      await this.sendSmtp(smtpHost, from, message);
      return;
    }

    this.logger.log(`[dev mail] to=${message.to} subject=${message.subject}`);
    if ((this.config.get<string>("NODE_ENV") ?? process.env.NODE_ENV) !== "test") {
      this.logger.log(message.text);
    }
  }

  private async sendResend(apiKey: string, from: string, message: MailMessage): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend failed: ${response.status} ${body}`);
    }
  }

  private async sendSmtp(host: string, from: string, message: MailMessage): Promise<void> {
    const port = Number(this.config.get<string>("SMTP_PORT") ?? "587");
    const secureRaw = this.config.get<string>("SMTP_SECURE");
    const secure =
      secureRaw === "1" || secureRaw?.toLowerCase() === "true" ? true : port === 465;
    const user = this.config.get<string>("SMTP_USER")?.trim();
    const pass = this.config.get<string>("SMTP_PASS");
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
    await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
