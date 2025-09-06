// Reemplazá el import viejo por este
import { Prisma } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function handleError(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ code: 'CONFLICT_UNIQUE', message: 'Violación de unicidad.' });
    }
    if (err.code === 'P2003') {
      const field = (err.meta?.field_name as string | undefined);
      return res.status(409).json({ code: 'CONFLICT_FK', message: 'Clave foránea inválida.', field });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Registro no encontrado.' });
    }
  }
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error interno.' });
}
