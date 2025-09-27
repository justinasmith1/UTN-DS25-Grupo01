import fetch from "node-fetch";
import { Readable } from "stream";
import type { FileMetadata, TipoFile } from "../types/files.types";
import { Archivos } from "../generated/prisma";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// Función auxiliar para cargar env en runtime (evita error al importar)
function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY; // ⚠️ este es el nombre correcto
  const bucket = process.env.SUPABASE_BUCKET || "lotes-files";

  if (!url) throw new Error("SUPABASE_URL no está definido");
  if (!key) throw new Error("SUPABASE_SERVICE_KEY no está definido");

  return { url, key, bucket };
}

function buildObjectPath(params: { idLoteAsociado: number; tipo: TipoFile; filename: string }) {
    return `lote-${params.idLoteAsociado}/${params.tipo}/${params.filename}`;
}

export async function uploadFileToSupabase(
    fileBuffer: Buffer, 
    metadata: { idLoteAsociado: number; tipo: TipoFile; filename: string; uploadedBy?: string | null; uplodedAt: Date}): 
    Promise<{objectPath: string}> {
        const { url, key, bucket } = getEnv();
        const objectPath = buildObjectPath({ idLoteAsociado: metadata.idLoteAsociado, tipo: metadata.tipo, filename: metadata.filename })
        const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURI(objectPath)}`,
        {
            method: 'POST',
            headers: {'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/octet-stream',
            },
            body: fileBuffer
        })

        if (!response.ok) {
            throw new Error(`Error uploading file to Supabase: ${response.statusText}`);
        }
        return {objectPath};
    }

// Genera una Signed URL 
export async function generateSignedUrl(objectPath: string, expiresIn: number = 3660): Promise<string> {
    const { url, key, bucket } = getEnv();
    const response = await fetch(`${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeURI(objectPath)}`,
    {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn })
    })

    if (!response.ok) {
        throw new Error(`Error generating signed URL: ${response.statusText}`);
    }

    const data = await response.json() as { signedURL: string}
    if (!data.signedURL) {
        throw new Error("No signed URL returned from Supabase");
    }
    return data.signedURL;
}

// Guardar metadata en la base de datos
export async function saveFileMetadata(metadata: Omit<FileMetadata, 'id'| 'uploadedAt'>): Promise<FileMetadata> {
    const newFile = await prisma.archivos.create({
        data: {
            nombreArchivo: metadata.filename,
            linkArchivo: metadata.url,
            tipo: metadata.tipo,
            idLoteAsociado: metadata.idLoteAsociado,
            uploadedBy: metadata.uploadedBy || null
        }
    })
    return {
        id: newFile.id,
        filename: newFile.nombreArchivo,
        url: newFile.linkArchivo,
        tipo: newFile.tipo as TipoFile,
        uploadedAt: newFile.createdAt,
        uploadedBy: newFile.uploadedBy,
        idLoteAsociado: newFile.idLoteAsociado
    };
}

export async function listByLote(idLoteAsociado: number): Promise<FileMetadata[]> {
    const rows = await prisma.archivos.findMany({
        where: { idLoteAsociado },
        orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => ({
        id: row.id,
        filename: row.nombreArchivo,
        url: row.linkArchivo,
        tipo: row.tipo as TipoFile,
        uploadedAt: row.createdAt,
        uploadedBy: row.uploadedBy,
        idLoteAsociado: row.idLoteAsociado
    }));
}

export async function getFileById(id: number): Promise<FileMetadata | null> {
    const file = await prisma.archivos.findUnique({
        where: { id }
    });
    if (!file) return null;
    return {
        id: file.id,
        filename: file.nombreArchivo,
        url: file.linkArchivo,
        tipo: file.tipo as TipoFile,
        uploadedAt: file.createdAt,
        uploadedBy: file.uploadedBy,
        idLoteAsociado: file.idLoteAsociado
    };
}   

export async function deleteFileById(id: number): Promise<void> {
    const { url, key, bucket} = getEnv();
    const file = await prisma.archivos.findUnique({
        where: { id }
    });
    if (!file) throw new Error("File not found");
    const objectPath = file.linkArchivo.split(`/${bucket}/`)[1];
    const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURI(objectPath)}`,
    {
        method: 'DELETE',
        headers: {'Authorization': `Bearer ${key}`},
    })
    if (!response.ok) {
        throw new Error(`Error deleting file from Supabase: ${response.statusText}`);
    }
    await prisma.archivos.delete({
        where: { id }
    });
}

export async function updateFileMetadata(id: number, updates: Partial<Omit<FileMetadata, 'id' | 'uploadedAt'>>): Promise<FileMetadata> {
    const existingFile = await prisma.archivos.findUnique({
        where: { id }
    });
    if (!existingFile) throw new Error("File not found");
    const updatedFile = await prisma.archivos.update({
        where: { id },
        data: {
            nombreArchivo: updates.filename || existingFile.nombreArchivo,
            linkArchivo: updates.url || existingFile.linkArchivo,
            tipo: updates.tipo || existingFile.tipo,
            idLoteAsociado: updates.idLoteAsociado || existingFile.idLoteAsociado,
            uploadedBy: updates.uploadedBy !== undefined ? updates.uploadedBy : existingFile.uploadedBy
        }
    });
    return {
        id: updatedFile.id,
        filename: updatedFile.nombreArchivo,
        url: updatedFile.linkArchivo,
        tipo: updatedFile.tipo as TipoFile,
        uploadedAt: updatedFile.createdAt,
        uploadedBy: updatedFile.uploadedBy,
        idLoteAsociado: updatedFile.idLoteAsociado
    };
}

