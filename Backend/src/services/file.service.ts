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
      upsert: false,
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

export async function saveFileMetadata(metadata: NewFileMetadata): Promise<FileMetadata> {
  const newFile = await prisma.archivos.create({
    data: {
      nombreArchivo: metadata.filename,
      linkArchivo: metadata.url,
      tipo: metadata.tipo,
      idLoteAsociado: metadata.idLoteAsociado,
      uploadedBy: metadata.uploadedBy || null,
    },
  });
  return {
    id: newFile.id,
    filename: newFile.nombreArchivo,
    url: newFile.linkArchivo,
    tipo: newFile.tipo as TipoFile,
    uploadedAt: newFile.createdAt,
    uploadedBy: newFile.uploadedBy,
    idLoteAsociado: newFile.idLoteAsociado,
  };
}

export async function listByLote(idLoteAsociado: number): Promise<FileMetadata[]> {
  const rows = await prisma.archivos.findMany({
    where: { idLoteAsociado },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    filename: row.nombreArchivo,
    url: row.linkArchivo,
    tipo: row.tipo as TipoFile,
    uploadedAt: row.createdAt,
    uploadedBy: row.uploadedBy,
    idLoteAsociado: row.idLoteAsociado,
  }));
}

export async function getFileById(id: number): Promise<FileMetadata | null> {
  const file = await prisma.archivos.findUnique({ where: { id } });
  if (!file) return null;
  return {
    id: file.id,
    filename: file.nombreArchivo,
    url: file.linkArchivo,
    tipo: file.tipo as TipoFile,
    uploadedAt: file.createdAt,
    uploadedBy: file.uploadedBy,
    idLoteAsociado: file.idLoteAsociado,
  };
}

export async function deleteFileById(id: number): Promise<void> {
  const file = await prisma.archivos.findUnique({ where: { id } });
  if (!file) throw new Error("File not found");

  const objectPath = file.linkArchivo.split(`${bucket}/`)[1];

  const { error } = await supabase.storage.from(bucket).remove([objectPath]);
  if (error) throw new Error(`Error deleting file: ${error.message}`);

  await prisma.archivos.delete({ where: { id } });
}

export async function updateFileMetadata(id: number, updates: UpdateFileMetadata): Promise<FileMetadata> {
  const existingFile = await prisma.archivos.findUnique({ where: { id } });
  if (!existingFile) throw new Error("File not found");

  const updatedFile = await prisma.archivos.update({
    where: { id },
    data: {
      nombreArchivo: updates.filename || existingFile.nombreArchivo,
      linkArchivo: updates.url || existingFile.linkArchivo,
      tipo: updates.tipo || (existingFile.tipo as TipoFile),
      idLoteAsociado: updates.idLoteAsociado || existingFile.idLoteAsociado,
      uploadedBy: updates.uploadedBy !== undefined ? updates.uploadedBy : existingFile.uploadedBy,
    },
  });

  return {
    id: updatedFile.id,
    filename: updatedFile.nombreArchivo,
    url: updatedFile.linkArchivo,
    tipo: updatedFile.tipo as TipoFile,
    uploadedAt: updatedFile.createdAt,
    uploadedBy: updatedFile.uploadedBy,
    idLoteAsociado: updatedFile.idLoteAsociado,
  };
}