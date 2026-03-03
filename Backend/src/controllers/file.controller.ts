import { Request, Response } from "express";
import * as FileService from "../services/file.service";
import { NewFileMetadata, UpdateFileMetadata, TipoFile } from "../types/files.types";

export class fileController {
    static async upload(req: Request, res: Response) {
        const file = req.file as Express.Multer.File;
        const { tipo, idLoteAsociado } = req.body as { tipo: TipoFile; idLoteAsociado: number };
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
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


