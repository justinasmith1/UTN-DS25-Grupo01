import { Router } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import { validate, validateParams} from '../middlewares/validation.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { fileMetadataSchema, createFileMetadataSchema, updateFileMetadataSchema, deleteFileMetadataSchema } from '../validations/filemeta.validation';
import * as fileController from '../controllers/file.controller';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

//GET /api/files/lote/:idLoteAsociado
router.get(
    '/lote/:idLoteAsociado',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    fileController.getAllFilesController);

//GET /api/files/:id
router.get(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    fileController.getFileByIdController);

// Obtener URL firmada para descargar/ver archivo
router.post(
    '/:id/url',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    fileController.generateSignedUrlController);

//POST /api/files
router.post(
    '/',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR', 'TECNICO'),
    upload.single('file'),
    validate(createFileMetadataSchema), 
    fileController.fileController.upload);

//PUT /api/files/:id
router.put(
    '/:id',
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    //validateParams(deleteFileMetadataSchema),
    //validate(updateFileMetadataSchema),
    fileController.updateFileController);

//DELETE /api/files/:id
router.delete(
    '/:id', 
    authenticate,
    authorize('ADMINISTRADOR', 'GESTOR'),
    //validateParams(deleteFileMetadataSchema),
    fileController.deleteFileController);

export const fileRoutes = router;