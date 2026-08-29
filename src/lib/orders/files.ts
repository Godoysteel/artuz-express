export const ARTWORK_BUCKET = "artes-pedidos";
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "ai", "psd", "svg", "cdr", "eps"];

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedFile(fileName: string, sizeBytes: number): { ok: true } | { ok: false; error: string } {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máximo 25 MB)." };
  }
  const ext = getFileExtension(fileName);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: `Formato não aceito. Use: ${ALLOWED_EXTENSIONS.join(", ")}.` };
  }
  return { ok: true };
}
