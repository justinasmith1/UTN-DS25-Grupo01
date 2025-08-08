// src/controllers/lote.controller.ts
import { Request, Response } from 'express';
import * as service from '../services/lote.service';

export const obtenerTodos = async (req: Request, res: Response)=> {
  const data = await service.getLotes();
  res.status(200).json(data);
};

export const obtenerPorId = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = await service.getLotesById(id);
  if (data) {
    res.status(200).json(data);
  } else {
    res.status(404).json({ message: 'Lote no encontrado' });
  }
};

export const crear = async (req: Request, res: Response) => {
  const data = await service.createLote(req.body);
  res.status(201).json(data);
};

export const actualizar = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const data = await service.updateLote(id, req.body);
  if (data) {
    res.status(200).json(data);
  } else {
    res.status(404).json({ message: 'Lote no encontrado' });
  }
};

export const eliminar = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const success = await service.deleteLote(id);
  if (success) {
    res.status(200).json({ message: 'Lote eliminado' });
  } else {
    res.status(404).json({ message: 'Lote no encontrado' });
  }
};
