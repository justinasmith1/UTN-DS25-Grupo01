// src/controllers/reserva.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getAllReservas,
  getReservaById,
  createReserva,
  updateReserva,
  deleteReserva,
  getReservaByImmobiliariaId,
  getReservaByEstado
} from '../services/reserva.service';
import { EstadoReserva } from '../types/interfacesCCLF';

// ==============================
// Obtener todas las reservas
// ==============================
// La query ya viene validada por el middleware de Zod.
export async function getAllReservasController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAllReservas();
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
    const id = Number(req.params.id);
    const data = await getReservaById(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAllReservasByInmobiliariaController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getReservaByImmobiliariaId(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAllReservasByEstadoController(req: Request, res: Response, next: NextFunction) {
  try {

    console.log('Query Params:', req.query);  // Imprime todo el query para depuración
    const estadoR = req.query.estado as EstadoReserva;
    console.log('Estado recibido:', estadoR);  // Imprime el valor de 'estado'
    const data = await getReservaByEstado(estadoR);
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
    const id = Number(req.params.id);
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
    const id = Number(req.params.id);
    await deleteReserva(id);
    res.json({ success: true, message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
} 
