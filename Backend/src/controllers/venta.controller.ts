//src/controllers/venta.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Venta, GetVentasResponse, GetVentaRequest, GetVentaResponse, PostVentaRequest, PostVentaResponse, PutVentaRequest, PutVentaResponse
, DeleteVentaRequest, DeleteVentaResponse } from '../types/interfacesCCLF'; 
import { getAllVentas, getVentaById, createVenta, updateVenta, deleteVenta } from '../services/venta.service';

export async function obtenerTodos(req: Request, res: Response<GetVentasResponse>, next: NextFunction) {
    try {
        const result = await getAllVentas();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function obtenerVentaPorId(req: Request<GetVentaRequest>, res: Response<GetVentaResponse>, next: NextFunction) {
    try {
        const idVenta = parseInt(String(req.params.idVenta), 10);
        const result = await getVentaById(idVenta);
        if (result.venta) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ venta: null, message: 'Venta no encontrada' });
        }
    } catch (error) {
        next(error);
    }
}

export async function crearVenta(req: Request<{}, PostVentaResponse, PostVentaRequest>, res: Response<PostVentaResponse>, next: NextFunction) {
    try {
        const { idLote, montoTotal, idComprador, fechaVenta } = req.body;
        if (!idLote || !montoTotal || !idComprador || !fechaVenta) {
            return res.status(400).json({ venta: null, message: 'Faltan datos obligatorios' });
        }
        const result = await createVenta(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function actualizarVenta(req: Request<PutVentaRequest>, res: Response<PutVentaResponse>, next: NextFunction) {
    try {
        const idVenta = parseInt(String(req.params.idVenta), 10);
        const result = await updateVenta(idVenta, req.body);
        if (result.message === 'Venta actualizada exitosamente') {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: 'Venta no encontrada' });
        }
    } catch (error) {
        next(error);
    }
}


export async function eliminarVenta(req: Request<DeleteVentaRequest>, res: Response<DeleteVentaResponse>, next: NextFunction) {
    try {
        const idVenta = parseInt(String(req.params.idVenta), 10);
        const result = await deleteVenta(idVenta);
        if (result.message === 'Venta eliminada exitosamente') {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: 'Venta no encontrada' });
        }
    } catch (error) {
        next(error);
    }
}

