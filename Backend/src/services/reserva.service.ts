// src/services/reserva.service.ts
import prisma from '../config/prisma'; 
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Esto es un mapper de errores de Prisma a errores HTTP para no tenes que hacerlo en cada funcion
// -------------------------------------
function mapPrismaError(e: unknown) {
  if (e instanceof PrismaClientKnownRequestError) {
    if (e.code === 'P2002') { // unique compuesta (clienteId + loteId + fechaReserva)
      const err: any = new Error('Ya existe una reserva para ese cliente, lote y fecha');
      err.status = 409; return err;
    }
    if (e.code === 'P2003') { // FK inválida
      const err: any = new Error('Alguna referencia (cliente/lote/inmobiliaria) no existe');
      err.status = 409; return err;
    }
    if (e.code === 'P2025') { // not found
      const err: any = new Error('La reserva no existe');
      err.status = 404; return err;
    }
  }
  return e;
}

// ==============================
// Obtener todas las reservas
// Retorna el listado junto con el total.
// ==============================
export async function getAllReservas(): Promise<{ reservas: any[]; total: number }> {
  const reservas = await prisma.reserva.findMany({
    orderBy: { fechaReserva: 'desc' },
    // sin include: mantenemos tipos simples como en las filminas
  });
  return { reservas, total: reservas.length };
}

// ==============================
// Obtener una reserva por ID
// ==============================
export async function getReservaById(id: number): Promise<any> {
  const row = await prisma.reserva.findUnique({ where: { id } });
  if (!row) {
    const err: any = new Error('La reserva no existe');
    err.status = 404;
    throw err;
  }
  return row; // devolvemos el registro tal cual viene de Prisma
}

// ==============================
// Crear reserva
// ==============================
export async function createReserva(body: {
  fechaReserva: string;           // ISO (lo transformo a Date)
  loteId: number;
  clienteId: number;
  inmobiliariaId?: number | null;
  sena?: number;                  // Zod ya garantiza >= 0 si viene
}): Promise<any> {
  try {
    const row = await prisma.reserva.create({
      data: {
        fechaReserva: new Date(body.fechaReserva), // ISO -> Date
        loteId: body.loteId,
        clienteId: body.clienteId,
        inmobiliariaId: body.inmobiliariaId ?? null,
        // Para Decimal no necesito new Decimal: Prisma acepta number|string
        ...(body.sena !== undefined ? { sena: body.sena } : {}),
      },
    });
    return row;
  } catch (e) {
    throw mapPrismaError(e);
  }
}

// ==============================
// Actualizar reserva (parcial)
// ==============================
export async function updateReserva(
  id: number,
  body: Partial<{
    fechaReserva: string;
    loteId: number;
    clienteId: number;
    inmobiliariaId: number | null;
    sena: number;
  }>
): Promise<any> {
  try {
    const row = await prisma.reserva.update({
      where: { id },
      data: {
        ...(body.fechaReserva !== undefined ? { fechaReserva: new Date(body.fechaReserva) } : {}),
        ...(body.loteId !== undefined ? { loteId: body.loteId } : {}),
        ...(body.clienteId !== undefined ? { clienteId: body.clienteId } : {}),
        ...(body.inmobiliariaId !== undefined ? { inmobiliariaId: body.inmobiliariaId } : {}),
        ...(body.sena !== undefined ? { sena: body.sena } : {}),
      },
    });
    return row;
  } catch (e) {
    throw mapPrismaError(e);
  }
}

// ==============================
// Eliminar reserva
// ==============================
export async function deleteReserva(id: number): Promise<void> {
  try {
    await prisma.reserva.delete({ where: { id } });
  } catch (e) {
    throw mapPrismaError(e);
  }
}
