import { describe, expect, it, vi } from "vitest";
import { fetchTorEdition } from "./client";

describe("fetchTorEdition", () => {
  it("treats 400/404 as a missing edition instead of aborting the catalog", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    await expect(fetchTorEdition("xinnian_año_serpiente_2025", fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      status: "EDITION_NOT_FOUND",
    });
  });

  it("retries 502 then skips the edition", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(fetchTorEdition("mundos_perdidos_horrores_de_salem", fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      status: "EDITION_NOT_FOUND",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
