// src/controllers/lote.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as loteService from '../services/lote.service';

//Obtener todos los lotes

export async function obtenerTodos(req: Request, res: Response, next: NextFunction) {
      try {
           // Llamo al servicio para obtener todos los Lotes
          const result = await loteService.getAllLotes();
          res.json({success: true,data:result});
      } catch (error) {
           next(error); // Paso el error al middleware de manejo
      }
}

// Obtener lote por ID

export async function obtenerLotePorId(req: Request, res: Response, next: NextFunction) {
    try {
        const idLote = parseInt(req.params.idLote);
        const result = await loteService.getLotesById(idLote);
        res.json({success: true,data:result});
    } catch (error) {
        next(error);
    }
}

//Crear nuevo lote

export async function crearLote(req: Request, res: Response, next: NextFunction) {
    try {
        // Creo el objeto tipado a partir del body
        const lote = await loteService.createLote(req.body);
        res.status(201).json({success: true,message: "Lote creado exitosamente",data:lote});
    }
    catch (error) {
        next(error);
    }
}

//Actualizar lote

export async function actualizarLote(req: Request, res: Response, next: NextFunction) {
    try {
        const idLote = parseInt(String(req.params.idLote), 10);
        const result = await loteService.updatedLote(idLote, req.body);
        res.json({success: true,message: "Lote actualizado exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}

//Eliminar lote 

export async function eliminarLote(req: Request, res: Response, next: NextFunction) {
    try {
        const idLote = parseInt(req.params.idLote);
        const result = await loteService.deleteLote(idLote);
        res.json({success: true,message: "Lote eliminado exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}
