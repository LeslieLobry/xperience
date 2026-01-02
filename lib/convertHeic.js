// lib/convertHeic.js
import heic2any from "heic2any";

function safeNameToJpg(originalName = "photo.heic") {
  return originalName.replace(/\.(heic|heif)$/i, "") + ".jpg";
}

export async function convertHeicIfNeeded(file) {
  if (!file) return file;

  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  const isHeic =
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  if (!isHeic) return file;

  // heic2any renvoie un Blob (ou un tableau de Blob)
  const output = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const blob = Array.isArray(output) ? output[0] : output;

  // On recrée un File JPEG pour garder le même workflow FormData
  const jpegFile = new File([blob], safeNameToJpg(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return jpegFile;
}
