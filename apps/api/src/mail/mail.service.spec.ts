import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MailService } from "./mail.service";

describe("MailService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs in development when no provider is configured", async () => {
    const spy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const service = new MailService({
      get: (key: string) => (key === "NODE_ENV" ? "development" : undefined),
    } as never);
    await service.send({ to: "a@b.cl", subject: "Hola", text: "cuerpo" });
    expect(spy.mock.calls.map((call) => call[0])).toEqual(["[dev mail] to=a@b.cl subject=Hola", "cuerpo"]);
  });

  it("posts to Resend when RESEND_API_KEY is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const service = new MailService({
      get: (key: string) => {
        if (key === "RESEND_API_KEY") return "re_test";
        if (key === "EMAIL_FROM") return "TCG <noreply@example.test>";
        return undefined;
      },
    } as never);
    await service.send({ to: "a@b.cl", subject: "Hola", text: "cuerpo", html: "<p>cuerpo</p>" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: ["a@b.cl"],
      subject: "Hola",
      html: "<p>cuerpo</p>",
    });
  });
});
