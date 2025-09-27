import { Request, Response } from "express";
import * as FileService from "../services/file.service";
import { FileMetadata, NewFileMetadata, UpdateFileMetadata, DeleteFileMetadata, TipoFile } from "../types/files.types";

export class fileController {
    static async upload(req: Request, res: Response) {
        const file = req.file as Express.Multer.File;
        //console.log(file);
        const { tipo, idLoteAsociado } = req.body as { tipo: TipoFile; idLoteAsociado: number };
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { originalname, buffer, mimetype } = file;
        console.log("TEST: \n", originalname, buffer, mimetype, tipo, idLoteAsociado);
        // Subir el archivo a Supabase Storage
        const { objectPath } = await FileService.uploadFileToSupabase(buffer,{
            idLoteAsociado,
            tipo,
            filename: originalname,
            uploadedBy: req.user?.email || null,
            uplodedAt: new Date()
        });

        // Guardar metadata en la base de datos

        const newFile = await FileService.saveFileMetadata({
            filename: originalname,
            url: objectPath,
            tipo,
            idLoteAsociado,
            uploadedBy: req.user?.email || null
        });
        res.status(201).json({ message: 'Archivo subido', data:newFile});
 }
}
// Controlador para obtener todos los archivos por lote
export const getAllFilesController = async (req: Request, res: Response) => {
     try {
        const files = await FileService.listByLote(req.params.idLoteAsociado ? parseInt(req.params.idLoteAsociado as string, 10) : 0);
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving files", error });
    }
};

// Genenerar URL firmada para subir archivo
export const generateSignedUrlController = async (req: Request, res: Response) => {
    const { filename } = req.body as { filename: string};
    try {
        const signedURL = await FileService.generateSignedUrl(filename);
        res.status(200).json({ signedURL });
    } catch (error) {
        res.status(500).json({ message: "Error generating signed URL", error });
    }   
};

// Controlador para obtener un archivo por ID
export const getFileByIdController = async (req: Request, res: Response) => {
    console.log(req)
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

// Controlador para crear un nuevo archivo
export const createFileController = async (req: Request, res: Response) => {
    const metadata: NewFileMetadata = req.body;
    try {
        const newFile = await FileService.saveFileMetadata(metadata);
        res.status(201).json(newFile);
    } catch (error) {
        res.status(500).json({ message: "Error saving file metadata", error });
    }   
};

// Controlador para actualizar un archivo existente
export const updateFileController = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const updates: UpdateFileMetadata = req.body;
    try {
        const updatedFile = await FileService.updateFileMetadata(id, updates);
        if (!updatedFile) {
            return res.status(404).json({ message: "File not found" });
        }
        res.status(200).json(updatedFile);
    } catch (error) {
        res.status(500).json({ message: "Error updating file metadata", error });
    }
};

// Controlador para eliminar un archivo
export const deleteFileController = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10); 
    try {
        await FileService.deleteFileById(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Error deleting file", error });
    }
};


