import { Request, Response } from "express";
import * as FileService from "../services/file.service";
import { NewFileMetadata, UpdateFileMetadata, TipoFile } from "../types/files.types";
import prisma from "../config/prisma";

const TIPOS_REQUIEREN_VENTA: TipoFile[] = ["BOLETO", "ESCRITURA", "OTRO"];
const TIPOS_PROHIBEN_VENTA: TipoFile[] = ["PLANO", "IMAGEN"];

export class fileController {
    static async upload(req: Request, res: Response) {
        const file = req.file as Express.Multer.File;
        const body = req.body as { tipo: TipoFile; idLoteAsociado: string; ventaId?: string };
        const idLoteAsociado = parseInt(body.idLoteAsociado, 10);
        const ventaIdRaw = body.ventaId;
        const ventaId = ventaIdRaw ? parseInt(ventaIdRaw, 10) : undefined;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        if (!idLoteAsociado || isNaN(idLoteAsociado)) {
            return res.status(400).json({ message: "idLoteAsociado es obligatorio" });
        }

        const tipo = body.tipo as TipoFile;
        if (!tipo || !["BOLETO", "ESCRITURA", "PLANO", "IMAGEN", "OTRO"].includes(tipo)) {
            return res.status(400).json({ message: "tipo inválido" });
        }

        if (TIPOS_REQUIEREN_VENTA.includes(tipo)) {
            if (!ventaId || isNaN(ventaId)) {
                return res.status(400).json({
                    message: `Para tipo ${tipo} se requiere ventaId`,
                });
            }
        }
        if (TIPOS_PROHIBEN_VENTA.includes(tipo)) {
            if (ventaId != null && !isNaN(ventaId)) {
                return res.status(400).json({
                    message: `Para tipo ${tipo} no se permite ventaId`,
                });
            }
        }

        if (ventaId != null && !isNaN(ventaId)) {
            const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { loteId: true } });
            if (!venta) {
                return res.status(400).json({ message: "Venta no encontrada" });
            }
            if (venta.loteId !== idLoteAsociado) {
                return res.status(400).json({
                    message: "La venta no pertenece al mismo lote que idLoteAsociado",
                });
            }
        }

        const { originalname, buffer } = file;
        const { objectPath } = await FileService.uploadFileToSupabase(buffer, {
            idLoteAsociado,
            tipo,
            filename: originalname,
            uploadedBy: req.user?.email || null,
            uplodedAt: new Date()
        });

        const newFile = await FileService.saveFileMetadata({
            filename: originalname,
            url: objectPath,
            tipo,
            idLoteAsociado,
            ventaId: ventaId ?? null,
            uploadedBy: req.user?.email || null
        });
        res.status(201).json({ message: 'Archivo subido', data: newFile });
    }
}

export const getAllFilesController = async (req: Request, res: Response) => {
    try {
        const idLote = req.params.idLoteAsociado ? parseInt(req.params.idLoteAsociado as string, 10) : 0;
        const includeDeleted = req.query.includeDeleted === "true";
        const files = await FileService.listByLote(idLote, includeDeleted);
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving files", error });
    }
};

export const getAllFilesByVentaController = async (req: Request, res: Response) => {
    try {
        const ventaId = parseInt(req.params.ventaId, 10);
        if (isNaN(ventaId)) {
            return res.status(400).json({ message: "ventaId inválido" });
        }
        const tipo = req.query.tipo as TipoFile | undefined;
        const files = await FileService.listByVenta(ventaId, tipo);
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving files by venta", error });
    }
};

export const sustituirArchivoController = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const file = req.file as Express.Multer.File;
    if (isNaN(id)) {
        return res.status(400).json({ message: "ID de archivo inválido" });
    }
    if (!file) {
        return res.status(400).json({ message: "No se proporcionó archivo para sustituir" });
    }
    try {
        const newFile = await FileService.sustituirArchivo(
            id,
            file.buffer,
            file.originalname,
            req.user?.email || null,
            req.user?.email || undefined
        );
        res.status(200).json({ message: "Archivo sustituido", data: newFile });
    } catch (error: any) {
        const status = error.statusCode ?? (error.message?.includes("encontrado") || error.message?.includes("eliminado") ? 400 : 500);
        res.status(status).json({ message: error.message || "Error al sustituir archivo" });
    }
};

// Signed URL obligatoria: obtiene objectPath del registro por ID, nunca del body
export const generateSignedUrlController = async (req: Request, res: Response) => {
    const fileId = parseInt(req.params.id, 10);
    if (isNaN(fileId)) {
        return res.status(400).json({ message: "ID de archivo inválido" });
    }

    try {
        const file = await FileService.getOperativeFileRaw(fileId);
        if (!file) {
            return res.status(404).json({ message: "Archivo no encontrado o eliminado" });
        }

        const expiresIn = 3600;
        const signedUrl = await FileService.generateSignedUrl(file.linkArchivo, expiresIn);
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        res.status(200).json({ signedUrl, signedURL: signedUrl, expiresAt });
    } catch (error) {
        res.status(500).json({ message: "Error generating signed URL", error });
    }
};

export const getFileByIdController = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    try {
        const file = await FileService.getFileById(id);
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }
        res.status(200).json(file);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving file", error });
    }
};

export const createFileController = async (req: Request, res: Response) => {
    const metadata: NewFileMetadata = req.body;
    try {
        const newFile = await FileService.saveFileMetadata(metadata);
        res.status(201).json(newFile);
    } catch (error) {
        res.status(500).json({ message: "Error saving file metadata", error });
    }
};

export const updateFileController = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const updates: UpdateFileMetadata = req.body;
    try {
        const updatedFile = await FileService.updateFileMetadata(id, updates);
        if (!updatedFile) {
            return res.status(404).json({ message: "File not found" });
        }
        res.status(200).json(updatedFile);
    } catch (error: any) {
        const status = error.message?.includes("eliminado") ? 400 : 500;
        res.status(status).json({ message: error.message || "Error updating file metadata" });
    }
};

export const deleteFileController = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    try {
        await FileService.deleteFileById(id, req.user?.email);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Error deleting file", error });
    }
};


