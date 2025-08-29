import { Request, Response, NextFunction } from 'express';
import * as inmobiliariaService from '../services/inmobiliaria.service';
import {
    GetInmobiliariaRequest,
    PostInmobiliariaRequest,
    PutInmobiliariaRequest
} from '../types/interfacesCCLF';

// ==============================
// Obtener todas las inmobiliarias
// ==============================
export async function getAllInmobiliariasController(req: Request, res: Response, next: NextFunction) {
    try {
        // Llamo al servicio para obtener todas las Inmobiliarias
        const result = await inmobiliariaService.getAllInmobiliarias();
        res.json({success: true,data:result});
    } catch (error) {
        next(error); // Paso el error al middleware de manejo
    }
}

// ==============================
// Obtener Inmobiliaria por ID
// ==============================
export async function getInmobiliariaByIdController(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id, 10);
        const result = await inmobiliariaService.getInmobiliariaById(id);

        // Si no encuentra la Inmobiliaria, devuelvo 404
        if (!result) {
            res.status(404).json(result);
            return;
        }
        res.json({success: true,data:result});
    } catch (error) {
        next(error);
    }
}

// ==============================
// Crear nueva Inmobiliaria
// ==============================
export async function createInmobiliariaController(req: Request, res: Response, next: NextFunction) {
    try {
        // Creo el objeto tipado a partir del body
        const data: PostInmobiliariaRequest = req.body;
        const result = await inmobiliariaService.createInmobiliaria(data);

        // Si no se crea por validacion, devuelvo 400
        if (!result) {
            res.status(400).json(result);
            return;
        }
        res.status(201).json({success: true,message: "Inmobiliaria creada exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}

// ==============================
// Actualizar Inmobiliaria existente
// ==============================
export async function updateInmobiliariaController(req: Request, res: Response, next: NextFunction) {
    try {
        // Construyo el request con ID por parametro y datos del body
        const idInmobiliaria = parseInt(req.params.id, 10);
        const data: PutInmobiliariaRequest = req.body;
        const result = await inmobiliariaService.updateInmobiliaria(idInmobiliaria, data);

        // Si no existe la Inmobiliaria, devuelvo 404
        if (result.message === 'Inmobiliaria no encontrada') {
            res.status(404).json(result);
            return;
        }
        res.json({success: true,message: "Inmobiliaria actualizada exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}

// ==============================
// Eliminar Inmobiliaria
// ==============================
export async function deleteInmobiliariaController(req: Request, res: Response, next: NextFunction) {
    try {
        // Construyo el request con el ID de la Inmobiliaria
        const idInmobiliaria = Number(req.params.id);
        const result = await inmobiliariaService.deleteInmobiliaria(idInmobiliaria);

        // Si no existe la Inmobiliaria, devuelvo 404
        if (result.message === 'Inmobiliaria no encontrada') {
            res.status(404).json(result);
            return;
        }
        res.json({success: true,message: "Inmobiliaria eliminada exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}
