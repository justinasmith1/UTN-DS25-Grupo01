// src/controllers/lote.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Lote, LoteVenta, GetLotesResponse, GetLoteResponse, PostLoteRequest, PostLoteResponse, PutLoteRequest, PutLoteResponse
, DeleteLoteRequest, DeleteLoteResponse } from '../types/interfacesCCLF';
import * as loteService from '../services/lote.service';

export const obtenerTodosLotes = async (req: Request, res: Response<GetLotesResponse>, next: NextFunction) => {
  try {
    const data = await loteService.getLotes();
    res.status(200).json({
      lotes: data,
      total: data.length
    });
  } catch (error) {
    next(error);
  }
};

export const obtenerPorIdLote = async (req: Request, res: Response<GetLoteResponse>, next: NextFunction) => {
  try {
    const id = req.params.id ? parseInt(String(req.params.id)) : 0;
    const data = await loteService.getLotesById(id);
    if (data) {
      res.status(200).json({ lote: data });
    } else {
      res.status(404).json({ lote: null, message: 'Lote no encontrado' });
    }
  } catch (error) {
    next(error);
  }
};

export const crearLote = async (req: Request<{}, PostLoteResponse, PostLoteRequest>, res: Response<PostLoteResponse>, next: NextFunction) => {
  try {
    // Validar datos de entrada
    const { fraccion, numero, estado, subestado, propietario, precio, ubicacion } = req.body;
    if (!fraccion || !numero || !estado || !subestado || !propietario || !precio || !ubicacion) {
      return res.status(400).json({  lote: null, message: 'Faltan datos obligatorios' });
    } // Crear nuevo lote 
    else {
        const data = await loteService.createLote(req.body);
        res.status(201).json({ lote: data, message: 'Lote creado', });
    }
  } catch (error) {
    next(error);
  }

};

export const actualizarLote = async (req: Request<PutLoteRequest, PutLoteResponse>, res: Response<PutLoteResponse>, next: NextFunction) => {
  try {
    const id = req.params.id ? parseInt(String(req.params.id)) : 0;
    const data = await loteService.updateLote(id, req.body);
    if (data) {
      res.status(200).json({ message: 'Lote actualizado' });
    } else {
      res.status(404).json({ message: 'Lote no encontrado' });
    }
  } catch (error) {
    next(error);
  }
};

export const eliminarLote = async (req: Request<DeleteLoteRequest>, res: Response<DeleteLoteResponse>, next: NextFunction) => {
  try {
    const id = req.params.idLote ? parseInt(String(req.params.idLote)) : 0;
    const success = await loteService.deleteLote(id);
    if (success) {
      res.status(200).json({ message: 'Lote eliminado' });
    } 
  } catch (error) {
    next(error);
  }
};
