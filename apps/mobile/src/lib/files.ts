import type { FileUploadView } from "@tcg/types";
import { api } from "./api";

export async function createDeferredFile(purpose: "LISTING" | "DISPUTE_EVIDENCE"): Promise<string> {
  const upload = await api<FileUploadView>("/v1/files/uploads", {
    method: "POST",
    body: JSON.stringify({ mime: "image/jpeg", size: 1024, purpose }),
  });
  await api(`/v1/files/${upload.fileId}/complete`, { method: "POST" });
  return upload.fileId;
}
