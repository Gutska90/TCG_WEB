import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  it("hashes with argon2id and verifies", async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash("correct-horse");
    await expect(passwords.verify(hash, "correct-horse")).resolves.toBe(true);
    await expect(passwords.verify(hash, "wrong")).resolves.toBe(false);
  });
});
