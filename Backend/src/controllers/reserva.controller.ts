import { Request, Response, NextFunction } from 'express';
import {
    getAllReservas,
    getReservaById,
    createReserva,
    updateReserva,
    deleteReserva
} from '../services/reserva.service';

// ==============================
// Obtener todas las reservas
// ==============================
export async function getAllReservasController(req: Request, res: Response, next: NextFunction) {
    try {
        // Llamo al service para obtener todas las reservas
        const result = await getAllReservas();
        res.json(result);
    } catch (error) {
        next(error); // Paso el error al middleware de manejo
    }
}

// ==============================
// Obtener reserva por ID
// ==============================
export const getReservaByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idReserva = Number(req.params.idReserva); 
    const reserva = await getReservaById(idReserva);
    res.json(reserva);
  } catch (error) {
    next(error);
  }
};


// ==============================
// Crear nueva reserva
// ==============================
export const createReservaController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const creada = await createReserva(req.body);  // el service es el que valida campos
    res.status(201).json(creada);
  } catch (error) {
    next(error);
  }
};

// ==============================
// Actualizar reserva existente
// ==============================
export const updateReservaController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idReserva = Number(req.params.idReserva); 
    const actualizada = await updateReserva(idReserva, req.body);
    res.json(actualizada);
  } catch (error) {
    next(error);
  }
};

// ==============================
// Eliminar reserva
// ==============================
export const deleteReservaController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idReserva = Number(req.params.idReserva); 
    await deleteReserva(idReserva);
    res.json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};
