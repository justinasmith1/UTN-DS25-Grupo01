// src/controllers/reserva.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getAllReservas,
  getReservaById,
  createReserva,
  updateReserva,
  deleteReserva,
} from '../services/reserva.service';

// ==============================
// Obtener todas las reservas
// ==============================
// La query ya viene validada por el middleware de Zod.
export async function getAllReservasController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAllReservas(req.query as any);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Obtener reserva por ID
// ==============================
// Los parametros ya vienen validados en la ruta (id entero positivo).
export async function getReservaByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number((req.params as any).id ?? (req.params as any).idReserva);
    const data = await getReservaById({ idReserva: id });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Crear nueva reserva
// ==============================
// Body validado por Zod (createReservaSchema.strict()).
export async function createReservaController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await createReserva(req.body);
    res.status(201).json({ success: true, message: 'Reserva creada exitosamente', data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Actualizar reserva
// ==============================
// Body parcial validado.
export async function updateReservaController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number((req.params as any).id ?? (req.params as any).idReserva);
    const data = await updateReserva(id, req.body);
    res.json({ success: true, message: 'Reserva actualizada exitosamente', data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Eliminar reserva
// ==============================
export async function deleteReservaController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number((req.params as any).id ?? (req.params as any).idReserva);
    await deleteReserva({ idReserva: id });
    res.json({ success: true, message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
} 
