import { describe, expect, it } from "vitest";
import { notificationEmailHtml, passwordResetEmailHtml, verificationEmailHtml } from "./mail.templates";

describe("mail templates", () => {
  it("renders verification and reset CTAs without leaking raw HTML", () => {
    const verify = verificationEmailHtml("http://localhost:3000", "tok<script>");
    expect(verify).toContain("Verifica tu email");
    expect(verify).toContain("http://localhost:3000/verificar-email?token=");
    expect(verify).not.toContain("<script>");

    const reset = passwordResetEmailHtml("http://localhost:3000", "abc");
    expect(reset).toContain("/recuperar-password?token=abc");
    expect(notificationEmailHtml("Compra", "Pedido <b>1</b>")).toContain("Pedido &lt;b&gt;1&lt;/b&gt;");
  });
});
