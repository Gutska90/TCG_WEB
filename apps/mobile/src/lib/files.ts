import type { FileUploadView } from "@tcg/types";
import * as ImagePicker from "expo-image-picker";
import { api } from "./api";

export async function uploadLocalUri(input: {
  uri: string;
  mime: string;
  size: number;
  purpose: "LISTING" | "AVATAR" | "DISPUTE_EVIDENCE";
}): Promise<string> {
  const mime = input.mime || "image/jpeg";
  const created = await api<FileUploadView>("/v1/files/uploads", {
    method: "POST",
    body: JSON.stringify({ mime, size: Math.max(1, input.size), purpose: input.purpose }),
  });
  if (created.uploadUrl) {
    const blobRes = await fetch(input.uri);
    const blob = await blobRes.blob();
    const put = await fetch(created.uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": mime },
    });
    if (!put.ok) throw new Error("No se pudo subir el archivo a storage");
  }
  await api(`/v1/files/${created.fileId}/complete`, { method: "POST" });
  return created.fileId;
}

export async function pickAndUploadImage(purpose: "LISTING" | "DISPUTE_EVIDENCE"): Promise<string> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) {
    throw new Error("cancel");
  }
  const asset = result.assets[0];
  return uploadLocalUri({
    uri: asset.uri,
    mime: asset.mimeType ?? "image/jpeg",
    size: asset.fileSize ?? 1024,
    purpose,
  });
}
