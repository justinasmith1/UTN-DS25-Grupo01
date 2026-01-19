// src/controllers/prioridad.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getAllPrioridades,
  getPrioridadById,
  createPrioridad,
  updatePrioridad,
  cancelPrioridad,
  finalizePrioridad,
  expirePrioridadesManual,
} from '../services/prioridad.service';

// ==============================
// Obtener todas las prioridades
// ==============================
export async function getAllPrioridadesController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user; // Usuario autenticado desde el middleware
    const query = req.query as any;
    const data = await getAllPrioridades(query, user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Obtener prioridad por ID
// ==============================
export async function getPrioridadByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const user = req.user; // Usuario autenticado desde el middleware
    const data = await getPrioridadById(id, user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Crear nueva prioridad
// ==============================
export async function createPrioridadController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    const data = await createPrioridad(req.body, user);
    res.status(201).json({ success: true, message: 'Prioridad creada exitosamente', data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Actualizar prioridad
// ==============================
export async function updatePrioridadController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const user = req.user;
    const data = await updatePrioridad(id, req.body, user);
    res.json({ success: true, message: 'Prioridad actualizada exitosamente', data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Cancelar prioridad
// ==============================
export async function cancelPrioridadController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const user = req.user; // Usuario autenticado desde el middleware
    const data = await cancelPrioridad(id, user);
    res.json({ success: true, message: 'Prioridad cancelada exitosamente', data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Finalizar prioridad
// ==============================
export async function finalizePrioridadController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const user = req.user; // Usuario autenticado desde el middleware
    const data = await finalizePrioridad(id, user);
    res.json({ success: true, message: 'Prioridad finalizada exitosamente', data });
  } catch (error) {
    next(error);
  }
}

// ==============================
// Expirar prioridades (job interno)
// ==============================
export async function expirePrioridadesController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await expirePrioridadesManual();
    res.json({ success: true, message: `Se expiraron ${result.expired} prioridades`, data: result });
  } catch (error) {
    next(error);
  }
}
