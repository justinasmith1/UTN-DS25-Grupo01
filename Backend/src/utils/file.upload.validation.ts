/**
 * Etapa 5.4.3 — Validaciones de upload (MIME, extensión, tamaño).
 * Solo se permiten: PDF, JPG/JPEG, PNG, WebP.
 * Tamaño máximo: 20 MB.
 */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const MIME_WHITELIST = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const EXT_WHITELIST = [".pdf", ".jpg", ".jpeg", ".png", ".webp"] as const;

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx).toLowerCase();
}

/**
 * Valida que el archivo cumpla MIME, extensión y tamaño.
 * Lanza error con statusCode 400 si no cumple.
 */
export function validateUploadFile(file: Express.Multer.File | undefined): void {
  if (!file) {
    const err = new Error("No file uploaded") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const mime = (file.mimetype || "").toLowerCase();
  if (!MIME_WHITELIST.includes(mime as any)) {
    const err = new Error(
      `Formato no permitido. Solo se aceptan: PDF, JPG, JPEG, PNG, WebP. Recibido: ${mime || "desconocido"}`
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const ext = getExtension(file.originalname || "");
  if (!EXT_WHITELIST.includes(ext as any)) {
    const err = new Error(
      `Extensión no permitida. Solo se aceptan: .pdf, .jpg, .jpeg, .png, .webp. Recibido: ${ext || "sin extensión"}`
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const size = file.size ?? (file.buffer?.length ?? 0);
  if (size > MAX_FILE_SIZE) {
    const err = new Error(
      `Archivo demasiado grande. Tamaño máximo permitido: 20 MB. Recibido: ${(size / 1024 / 1024).toFixed(2)} MB`
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
}
