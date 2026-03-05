import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../generated/prisma";
import type { FileMetadata, TipoFile, NewFileMetadata, UpdateFileMetadata } from "../types/files.types";

const prisma = new PrismaClient();

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY; // service_role en backend
  const bucket = process.env.SUPABASE_BUCKET || "lotes-files";

  if (!url) throw new Error("SUPABASE_URL no está definido");
  if (!key) throw new Error("SUPABASE_SERVICE_KEY no está definido");

  return { url, key, bucket };
}

const { url, key, bucket } = getEnv();
const supabase = createClient(url, key);

function buildObjectPath(params: { idLoteAsociado: number; tipo: TipoFile; filename: string }) {
  return `lote-${params.idLoteAsociado}/${params.tipo}/${params.filename}`;
}

export async function uploadFileToSupabase(
  fileBuffer: Buffer,
  metadata: { idLoteAsociado: number; tipo: TipoFile; filename: string; uploadedBy?: string | null; uplodedAt: Date }
): Promise<{ objectPath: string }> {
  const objectPath = buildObjectPath({
    idLoteAsociado: metadata.idLoteAsociado,
    tipo: metadata.tipo,
    filename: metadata.filename,
  });

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, fileBuffer, {
      contentType: "application/octet-stream",
      upsert: true, // Permitir sobrescribir archivos existentes
    });

  if (error) throw new Error(`Error uploading file: ${error.message}`);

  return { objectPath };
}

export async function generateSignedUrl(objectPath: string, expiresIn: number = 3660): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Error generating signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

function toFileMetadata(row: any): FileMetadata {
  return {
    id: row.id,
    filename: row.nombreArchivo,
    url: row.linkArchivo,
    tipo: row.tipo as TipoFile,
    uploadedAt: row.createdAt,
    updatedAt: row.updatedAt,
    uploadedBy: row.uploadedBy,
    idLoteAsociado: row.idLoteAsociado,
    ventaId: row.ventaId ?? null,
    estadoOperativo: row.estadoOperativo,
    deletedBy: row.deletedBy,
  };
}

export async function saveFileMetadata(metadata: NewFileMetadata): Promise<FileMetadata> {
  const newFile = await prisma.archivos.create({
    data: {
      nombreArchivo: metadata.filename,
      linkArchivo: metadata.url,
      tipo: metadata.tipo,
      idLoteAsociado: metadata.idLoteAsociado,
      ventaId: metadata.ventaId ?? null,
      uploadedBy: metadata.uploadedBy || null,
    },
  });
  return toFileMetadata(newFile);
}

export async function listByLote(idLoteAsociado: number, includeDeleted = false): Promise<FileMetadata[]> {
  const where: any = { idLoteAsociado };
  if (!includeDeleted) {
    where.estadoOperativo = "OPERATIVO";
  }
  const rows = await prisma.archivos.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toFileMetadata);
}

export async function listByVenta(
  ventaId: number,
  tipo?: TipoFile
): Promise<FileMetadata[]> {
  const where: any = { ventaId, estadoOperativo: "OPERATIVO" };
  if (tipo) {
    where.tipo = tipo;
  }
  const rows = await prisma.archivos.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toFileMetadata);
}

export async function getFileById(id: number): Promise<FileMetadata | null> {
  const file = await prisma.archivos.findUnique({ where: { id } });
  if (!file || file.estadoOperativo === "ELIMINADO") return null;
  return toFileMetadata(file);
}

// Soft delete: marca el registro como ELIMINADO sin tocar el binario en storage
export async function deleteFileById(id: number, deletedByEmail?: string): Promise<void> {
  const file = await prisma.archivos.findUnique({ where: { id } });
  if (!file) throw new Error("File not found");

  await prisma.archivos.update({
    where: { id },
    data: {
      estadoOperativo: "ELIMINADO",
      fechaBaja: new Date(),
      deletedBy: deletedByEmail || null,
    },
  });
}

export async function updateFileMetadata(id: number, updates: UpdateFileMetadata): Promise<FileMetadata> {
  const existingFile = await prisma.archivos.findUnique({ where: { id } });
  if (!existingFile) throw new Error("File not found");
  if (existingFile.estadoOperativo === "ELIMINADO") {
    throw new Error("No se puede modificar un archivo eliminado");
  }

  const updatedFile = await prisma.archivos.update({
    where: { id },
    data: {
      nombreArchivo: updates.filename || existingFile.nombreArchivo,
      linkArchivo: updates.url || existingFile.linkArchivo,
      tipo: updates.tipo || (existingFile.tipo as TipoFile),
      idLoteAsociado: updates.idLoteAsociado || existingFile.idLoteAsociado,
      ventaId: updates.ventaId !== undefined ? updates.ventaId : existingFile.ventaId,
      uploadedBy: updates.uploadedBy !== undefined ? updates.uploadedBy : existingFile.uploadedBy,
    },
  });

  return toFileMetadata(updatedFile);
}

// Busca un archivo operativo por ID y devuelve el registro crudo (para signed URL)
export async function getOperativeFileRaw(id: number) {
  const file = await prisma.archivos.findUnique({ where: { id } });
  if (!file || file.estadoOperativo === "ELIMINADO") return null;
  return file;
}

/**
 * Sustituir documento: soft delete del anterior + subir nuevo del mismo tipo, loteId, ventaId.
 * NO cambia EstadoVenta.
 */
export async function sustituirArchivo(
  id: number,
  fileBuffer: Buffer,
  originalname: string,
  uploadedBy?: string | null,
  deletedByEmail?: string
): Promise<FileMetadata> {
  const oldFile = await prisma.archivos.findUnique({ where: { id } });
  if (!oldFile) throw new Error("Archivo no encontrado");
  if (oldFile.estadoOperativo === "ELIMINADO") {
    throw new Error("No se puede sustituir un archivo eliminado");
  }
  const tipo = oldFile.tipo as TipoFile;
  const tiposSustituibles: TipoFile[] = ["BOLETO", "ESCRITURA", "OTRO"];
  if (!tiposSustituibles.includes(tipo)) {
    throw new Error(
      `No se puede sustituir archivos de tipo ${tipo}. Solo BOLETO, ESCRITURA u OTRO.`
    );
  }

  const { objectPath } = await uploadFileToSupabase(fileBuffer, {
    idLoteAsociado: oldFile.idLoteAsociado,
    tipo,
    filename: originalname,
    uploadedBy: uploadedBy || null,
    uplodedAt: new Date(),
  });

  const newFile = await prisma.$transaction(async (tx) => {
    await tx.archivos.update({
      where: { id },
      data: {
        estadoOperativo: "ELIMINADO",
        fechaBaja: new Date(),
        deletedBy: deletedByEmail || null,
      },
    });
    return tx.archivos.create({
      data: {
        nombreArchivo: originalname,
        linkArchivo: objectPath,
        tipo,
        idLoteAsociado: oldFile.idLoteAsociado,
        ventaId: oldFile.ventaId,
        uploadedBy: uploadedBy || null,
      },
    });
  });
  return toFileMetadata(newFile);
}