import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM") ?? "TCG Platform <noreply@localhost>";

    if (!apiKey) {
      this.logger.log(`[dev mail] to=${message.to} subject=${message.subject}\n${message.text}`);
      return;
    }

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
}
