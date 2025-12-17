// src/services/prioridad.service.ts
import prisma from '../config/prisma';
import { EstadoLote, EstadoPrioridad, OwnerPrioridad } from '../generated/prisma';
import { updateLoteState } from './lote.service';

// ==============================
// Crear prioridad
// ==============================
export async function createPrioridad(
  body: {
    loteId: number;
    fechaFin: string; // ISO string
  },
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  // Validar que el lote exista
  const lote = await prisma.lote.findUnique({ where: { id: body.loteId } });
  if (!lote) {
    const err: any = new Error('Lote no encontrado');
    err.status = 404;
    throw err;
  }

  // Validar que el lote esté DISPONIBLE o EN_PROMOCION
  if (lote.estado !== EstadoLote.DISPONIBLE && lote.estado !== EstadoLote.EN_PROMOCION) {
    const err: any = new Error('Solo se puede crear una prioridad para lotes DISPONIBLE o EN_PROMOCION');
    err.status = 400;
    throw err;
  }

  // Validar que no exista prioridad ACTIVA para ese lote
  const prioridadActiva = await prisma.prioridad.findFirst({
    where: {
      loteId: body.loteId,
      estado: EstadoPrioridad.ACTIVA,
    },
  });

  if (prioridadActiva) {
    const err: any = new Error('Ya existe una prioridad ACTIVA para este lote');
    err.status = 409;
    throw err;
  }

  // Validar fechas: fechaFin debe ser posterior a ahora
  const fechaFinDate = new Date(body.fechaFin);
  const now = new Date();
  if (fechaFinDate <= now) {
    const err: any = new Error('La fecha de fin debe ser posterior a la fecha actual');
    err.status = 400;
    throw err;
  }

  // Definir ownerType según el rol del usuario
  let ownerType: OwnerPrioridad;
  let inmobiliariaIdFinal: number | null = null;

  if (user?.role === 'INMOBILIARIA') {
    if (!user.inmobiliariaId) {
      const err: any = new Error('El usuario INMOBILIARIA no tiene una inmobiliaria asociada');
      err.status = 400;
      throw err;
    }
    
    // Validar límite de prioridades activas para INMOBILIARIA
    const inm = await prisma.inmobiliaria.findUnique({
      where: { id: user.inmobiliariaId },
      select: { maxPrioridadesActivas: true },
    });
    const limite = inm?.maxPrioridadesActivas ?? 5;
    
    const activas = await prisma.prioridad.count({
      where: { inmobiliariaId: user.inmobiliariaId, estado: EstadoPrioridad.ACTIVA },
    });
    
    if (activas >= limite) {
      const err: any = new Error(`La inmobiliaria alcanzó el límite de prioridades activas (${limite}).`);
      err.status = 400;
      throw err;
    }
    
    ownerType = OwnerPrioridad.INMOBILIARIA;
    inmobiliariaIdFinal = user.inmobiliariaId;
  } else if (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR') {
    ownerType = OwnerPrioridad.CCLF;
    inmobiliariaIdFinal = null;
  } else {
    const err: any = new Error('No tienes permisos para crear prioridades');
    err.status = 403;
    throw err;
  }

  // Guardar loteEstadoAlCrear y crear la prioridad
  const prioridad = await prisma.prioridad.create({
    data: {
      loteId: body.loteId,
      estado: EstadoPrioridad.ACTIVA,
      ownerType: ownerType,
      inmobiliariaId: inmobiliariaIdFinal,
      fechaInicio: new Date(),
      fechaFin: new Date(body.fechaFin),
      loteEstadoAlCrear: lote.estado, // Guardamos el estado original del lote
    },
  });

  // Cambiar lote a CON_PRIORIDAD
  await updateLoteState(body.loteId, 'Con Prioridad');

  return prioridad;
}

// ==============================
// Cancelar prioridad
// ==============================
export async function cancelPrioridad(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  const prioridad = await prisma.prioridad.findUnique({
    where: { id },
    select: { id: true, estado: true, loteId: true, loteEstadoAlCrear: true, ownerType: true, inmobiliariaId: true },
  });

  if (!prioridad) {
    const err: any = new Error('Prioridad no encontrada');
    err.status = 404;
    throw err;
  }

  // Validar permisos: INMOBILIARIA solo puede cancelar sus propias prioridades
  if (user?.role === 'INMOBILIARIA') {
    if (!user.inmobiliariaId) {
      const err: any = new Error('El usuario INMOBILIARIA no tiene una inmobiliaria asociada');
      err.status = 400;
      throw err;
    }
    if (prioridad.ownerType !== OwnerPrioridad.INMOBILIARIA || prioridad.inmobiliariaId !== user.inmobiliariaId) {
      const err: any = new Error('No puedes cancelar esta prioridad');
      err.status = 403;
      throw err;
    }
  } else if (user?.role !== 'ADMINISTRADOR' && user?.role !== 'GESTOR') {
    const err: any = new Error('No tienes permisos para cancelar prioridades');
    err.status = 403;
    throw err;
  }

  // Marcar como CANCELADA
  const updated = await prisma.prioridad.update({
    where: { id },
    data: { estado: EstadoPrioridad.CANCELADA },
  });

  // Restaurar el estado original del lote
  const estadoARestaurar = prioridad.loteEstadoAlCrear === EstadoLote.EN_PROMOCION ? 'En Promoción' : 'Disponible';
  await updateLoteState(prioridad.loteId, estadoARestaurar);

  return updated;
}

// ==============================
// Finalizar prioridad
// ==============================
export async function finalizePrioridad(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  const prioridad = await prisma.prioridad.findUnique({
    where: { id },
    select: { id: true, estado: true, loteId: true, loteEstadoAlCrear: true, ownerType: true, inmobiliariaId: true },
  });

  if (!prioridad) {
    const err: any = new Error('Prioridad no encontrada');
    err.status = 404;
    throw err;
  }

  // Validar permisos: INMOBILIARIA solo puede finalizar sus propias prioridades
  if (user?.role === 'INMOBILIARIA') {
    if (!user.inmobiliariaId) {
      const err: any = new Error('El usuario INMOBILIARIA no tiene una inmobiliaria asociada');
      err.status = 400;
      throw err;
    }
    if (prioridad.ownerType !== OwnerPrioridad.INMOBILIARIA || prioridad.inmobiliariaId !== user.inmobiliariaId) {
      const err: any = new Error('No puedes finalizar esta prioridad');
      err.status = 403;
      throw err;
    }
  } else if (user?.role !== 'ADMINISTRADOR' && user?.role !== 'GESTOR') {
    const err: any = new Error('No tienes permisos para finalizar prioridades');
    err.status = 403;
    throw err;
  }

  // Marcar como FINALIZADA
  const updated = await prisma.prioridad.update({
    where: { id },
    data: { estado: EstadoPrioridad.FINALIZADA },
  });

  // Restaurar el estado original del lote
  const estadoARestaurar = prioridad.loteEstadoAlCrear === EstadoLote.EN_PROMOCION ? 'En Promoción' : 'Disponible';
  await updateLoteState(prioridad.loteId, estadoARestaurar);

  return updated;
}

// ==============================
// Expirar prioridades vencidas (manual)
// ==============================
export async function expirePrioridadesManual(): Promise<{ expired: number }> {
  const now = new Date();

  // Buscar prioridades ACTIVA vencidas (necesitamos loteId y loteEstadoAlCrear para restaurar)
  const prioridadesVencidas = await prisma.prioridad.findMany({
    where: {
      estado: EstadoPrioridad.ACTIVA,
      fechaFin: {
        lt: now, // fechaFin < now
      },
    },
    select: { id: true, loteId: true, loteEstadoAlCrear: true },
  });

  if (prioridadesVencidas.length === 0) {
    return { expired: 0 };
  }

  // Marcar todas como EXPIRADA
  await prisma.prioridad.updateMany({
    where: {
      id: { in: prioridadesVencidas.map((p) => p.id) },
    },
    data: {
      estado: EstadoPrioridad.EXPIRADA,
    },
  });

  // Restaurar el estado original de cada lote
  for (const prioridad of prioridadesVencidas) {
    const estadoARestaurar = prioridad.loteEstadoAlCrear === EstadoLote.EN_PROMOCION ? 'En Promoción' : 'Disponible';
    await updateLoteState(prioridad.loteId, estadoARestaurar);
  }

  return { expired: prioridadesVencidas.length };
}
