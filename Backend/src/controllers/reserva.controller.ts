import { Request, Response, NextFunction } from 'express';
import {
    getAllReservas,
    getReservaById,
    createReserva,
    updateReserva,
    deleteReserva
} from '../services/reserva.service';
import {
    GetReservaRequest,
    PostReservaRequest,
    PutReservaRequest
} from '../types/interfacesCCLF';

// ==============================
// Obtener todas las reservas
// ==============================
export async function getAllReservasController(req: Request, res: Response, next: NextFunction) {
    try {
        // Llamo al servicio para obtener todas las reservas
        const result = await getAllReservas();
        res.json(result);
    } catch (error) {
        next(error); // Paso el error al middleware de manejo
    }
}

// ==============================
// Obtener reserva por ID
// ==============================
export async function getReservaByIdController(req: Request, res: Response, next: NextFunction) {
    try {
        // Construyo el request tipado a partir de los parametros
        const request: GetReservaRequest = { idReserva: Number(req.params.id) };
        const result = await getReservaById(request);

        // Si no encuentra la reserva, devuelvo 404
        if (!result.reserva) {
            res.status(404).json(result);
            return;
        }
        res.json(result);
    } catch (error) {
        next(error);
    }
}

// ==============================
// Crear nueva reserva
// ==============================
export async function createReservaController(req: Request, res: Response, next: NextFunction) {
    try {
        // Creo el objeto tipado a partir del body
        const data: PostReservaRequest = req.body;
        const result = await createReserva(data);

        // Si no se crea por validacion, devuelvo 400
        if (!result.reserva) {
            res.status(400).json(result);
            return;
        }
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

// ==============================
// Actualizar reserva existente
// ==============================
export async function updateReservaController(req: Request, res: Response, next: NextFunction) {
    try {
        // Construyo el request con ID por parametro y datos del body
        const idReserva = Number(req.params.id);
        const data: PutReservaRequest = req.body;
        const result = await updateReserva(idReserva, data);

        // Si no existe la reserva, devuelvo 404
        if (result.message === 'Reserva no encontrada') {
            res.status(404).json(result);
            return;
        }
        res.json(result);
    } catch (error) {
        next(error);
    }
}

// ==============================
// Eliminar reserva
// ==============================
export async function deleteReservaController(req: Request, res: Response, next: NextFunction) {
    try {
        // Construyo el request con el ID de la reserva
        const idReserva = Number(req.params.id);
        const result = await deleteReserva(idReserva);

        // Si no existe la reserva, devuelvo 404
        if (result.message === 'Reserva no encontrada') {
            res.status(404).json(result);
            return;
        }
        res.json(result);
    } catch (error) {
        next(error);
    }
}
