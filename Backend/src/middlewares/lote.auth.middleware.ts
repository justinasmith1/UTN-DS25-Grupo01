import { Request, Response, NextFunction } from 'express';
import * as loteService from '../services/lote.service';

class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
}
}

/**
 * Middleware para autorizar a un TECNICO a operar sobre un lote.
 * Si el usuario es un TECNICO, verifica que el lote esté en estado 'EN_CONSTRUCCION'.
 * Si no es TECNICO, simplemente pasa al siguiente middleware.
 * Este middleware debe usarse DESPUÉS de `authenticate` y `authorize`.
 */
export const checkLoteStatusForTecnico = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore - Asumimos que req.user es poblado por el middleware de autenticación
        const user = req.user;

        if (user && user.role === 'TECNICO') {
            const loteId = parseInt(req.params.id, 10);
            const lote = await loteService.getLoteById(loteId);
            
            if (lote && lote.subestado !== 'EN_CONSTRUCCION') {
                return next(new AppError('Los técnicos solo pueden operar sobre lotes en construcción', 403));
            }
        }
        return next();
    } catch (error) {
        next(error);
    }
};