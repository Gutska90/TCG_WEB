import type { FileUploadView } from "@tcg/types";
import { api } from "./api";

export async function uploadUserFile(
  file: Blob & { name?: string; type: string },
  purpose: "LISTING" | "AVATAR" | "DISPUTE_EVIDENCE",
): Promise<string> {
  const mime = file.type || "image/jpeg";
  const created = await api<FileUploadView>("/v1/files/uploads", {
    method: "POST",
    body: JSON.stringify({ mime, size: file.size, purpose }),
  });
  if (created.uploadUrl) {
    const put = await fetch(created.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": mime },
    });
    if (!put.ok) {
      throw new Error("No se pudo subir el archivo a storage");
    }
  }
  await api(`/v1/files/${created.fileId}/complete`, { method: "POST" });
  return created.fileId;
}
