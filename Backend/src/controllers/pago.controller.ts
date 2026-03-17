// src/controllers/pago.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as pagoService from '../services/pago.service';

export async function obtenerContextoPagos(req: Request, res: Response, next: NextFunction) {
  try {
    const ventaId = parseInt(req.params.ventaId);
    const result = await pagoService.getPagosContextByVentaId(ventaId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function crearPlanPagoInicial(req: Request, res: Response, next: NextFunction) {
  try {
    const ventaId = parseInt(req.params.ventaId);
    const user = req.user;
    const result = await pagoService.createPlanPagoInicial(ventaId, req.body, user);
    res.status(201).json({ success: true, message: 'Plan de pago creado exitosamente', data: result });
  } catch (error) {
    next(error);
  }
}
