// src/services/reserva.service.ts
import prisma from '../config/prisma'; 
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { EstadoLote, EstadoReserva, EstadoPrioridad, OwnerPrioridad } from '../generated/prisma';
import { updateLoteState } from './lote.service';
import { ESTADO_LOTE_OP } from '../domain/loteState/loteState.types';
import { assertLoteOperableFor, assertReservaUnicaVigente, computeRestoreStateFromReserva } from '../domain/loteState/loteState.rules';
import { cancelPrioridadActivaOnReserva } from '../domain/loteState/loteState.effects';

// Esto es un mapper de errores de Prisma a errores HTTP para no tenes que hacerlo en cada funcion
// -------------------------------------
function mapPrismaError(e: unknown) {
  if (e instanceof PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      // Verificar si es un error de unicidad de numero
      if (e.meta?.target && Array.isArray(e.meta.target) && e.meta.target.includes('numero')) {
        const err: any = new Error('Ya existe una reserva con este número');
        err.status = 409;
        return err;
      }
      // unique compuesta (clienteId + loteId + fechaReserva)
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
// Si el usuario es INMOBILIARIA, solo devuelve las reservas de su inmobiliaria.
// ==============================
export async function getAllReservas(
  query?: { estadoOperativo?: string },
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<{ reservas: any[]; total: number }> {
  const whereClause: any = {};
  
  // Si el usuario es INMOBILIARIA, filtrar por su inmobiliariaId
  if (user?.role === 'INMOBILIARIA' && user?.inmobiliariaId != null) {
    whereClause.inmobiliariaId = user.inmobiliariaId;
  }

  // Filtro estadoOperativo: default OPERATIVO si no viene
  if (query?.estadoOperativo) {
    whereClause.estadoOperativo = query.estadoOperativo;
  } else {
    whereClause.estadoOperativo = 'OPERATIVO'; // Default: solo operativas
  }
  
  const reservas = await prisma.reserva.findMany({
    where: whereClause,
    orderBy: { fechaReserva: 'desc' },
    include: {
          cliente: {
            select: { id: true, nombre: true, apellido: true }, // lo que muestra la tabla
          },
          inmobiliaria: {
            select: { id: true, nombre: true }, // nombre visible
          },
      lote: { select: { id: true, precio: true, mapId: true, numero: true, fraccion: { select: { numero: true } } } },
        },
  });
  return { reservas, total: reservas.length };
}

// ==============================
// Obtener una reserva por ID
// Valida permisos: INMOBILIARIA solo puede ver sus propias reservas.
// ==============================
export async function getReservaById(id: number, user?: { role: string; inmobiliariaId?: number | null }): Promise<any> {
  const row = await prisma.reserva.findUnique({ 
    where: { id },
    include: {
      cliente: {
        select: { id: true, nombre: true, apellido: true },
      },
      inmobiliaria: {
        select: { id: true, nombre: true },
      },
      lote: { select: { id: true, precio: true, mapId: true, numero: true, fraccion: { select: { numero: true } } } },
    },
  });
  if (!row) {
    const err: any = new Error('La reserva no existe');
    err.status = 404;
    throw err;
  }
  
  // Validar permisos: INMOBILIARIA solo puede ver sus propias reservas
  if (user?.role === 'INMOBILIARIA') {
    if (row.inmobiliariaId !== user.inmobiliariaId) {
      const err: any = new Error('No puedes ver esta reserva');
      err.status = 403;
      throw err;
    }
  } else if (user?.role !== 'ADMINISTRADOR' && user?.role !== 'GESTOR') {
    // Cualquier otro rol que no sea Admin/Gestor/Inmobiliaria queda bloqueado
    const err: any = new Error('No tienes permisos para ver esta reserva');
    err.status = 403;
    throw err;
  }
  
  return row; // devolvemos el registro con relaciones incluidas
}


export async function getReservaByImmobiliariaId(id: number): Promise<any> {
  const row = await prisma.reserva.findMany({ where: { inmobiliariaId: id } });
  if (!row) {
    const err: any = new Error('Inmobialiaria no existe');
    err.status = 404;
    throw err;
  }
  return row; // devolvemos el registro tal cual viene de Prisma
}

// Buscar reservas por estado -- Nuevo
export async function getReservaByEstado(estadoR: EstadoReserva): Promise<any> {
  const row = await prisma.reserva.findMany({ where: { estado: estadoR } });
  if (row.length === 0) {
    const err: any = new Error('No se encontraron reservas con ese estado');
    err.status = 404;
    throw err;
  }
  return row; // devolvemos el registro tal cual viene de Prisma
}

// ==============================
// Crear reserva
// ==============================
export async function createReserva(
  body: {
    fechaReserva: string;           // ISO (lo transformo a Date)
    estado: EstadoReserva;         // Nuevo campo estado
    loteId: number;
    clienteId: number;
    inmobiliariaId?: number | null;
    sena?: number;                  // Zod ya garantiza >= 0 si viene
    numero: string;                 // Número de reserva (obligatorio y único)
    fechaFinReserva: string;     // Fecha de fin de la reserva
  },
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: body.loteId } });
    if (!lote) {
      throw new Error("Lote no encontrado.");
    }
    // Validar que el lote esté operativo (bloquea NO_DISPONIBLE)
    assertLoteOperableFor('crear reserva', lote.estado);

    // Permitir reservar si el lote está DISPONIBLE, EN_PROMOCION o CON_PRIORIDAD
    if (lote.estado !== EstadoLote.DISPONIBLE && lote.estado !== EstadoLote.EN_PROMOCION && lote.estado !== EstadoLote.CON_PRIORIDAD) {
      throw new Error("El lote no está disponible para reservar.");
    }

    // Validar unicidad: solo puede haber 1 reserva vigente (ACTIVA o ACEPTADA) por lote
    await assertReservaUnicaVigente(body.loteId);

    // Si el lote está CON_PRIORIDAD, validar exclusividad de la prioridad
    if (lote.estado === EstadoLote.CON_PRIORIDAD) {
      const prioridadActiva = await prisma.prioridad.findFirst({
        where: {
          loteId: body.loteId,
          estado: EstadoPrioridad.ACTIVA,
        },
      });

      if (!prioridadActiva) {
        const err: any = new Error('Lote marcado Con Prioridad pero no hay prioridad activa');
        err.status = 409;
        throw err;
      }

      // Validar exclusividad según ownerType de la prioridad
      if (prioridadActiva.ownerType === OwnerPrioridad.CCLF) {
        // Solo ADMINISTRADOR/GESTOR pueden reservar lotes con prioridad CCLF
        if (user?.role !== 'ADMINISTRADOR' && user?.role !== 'GESTOR') {
          const err: any = new Error('Solo administradores y gestores pueden reservar lotes con prioridad CCLF');
          err.status = 403;
          throw err;
        }
      } else if (prioridadActiva.ownerType === OwnerPrioridad.INMOBILIARIA) {
        // Solo la inmobiliaria dueña de la prioridad puede reservar
        if (user?.role === 'INMOBILIARIA') {
          if (!user.inmobiliariaId) {
            const err: any = new Error('El usuario INMOBILIARIA no tiene una inmobiliaria asociada');
            err.status = 400;
            throw err;
          }
          if (prioridadActiva.inmobiliariaId !== user.inmobiliariaId) {
            const err: any = new Error('No puedes reservar este lote: la prioridad pertenece a otra inmobiliaria');
            err.status = 403;
            throw err;
          }
        } else if (user?.role !== 'ADMINISTRADOR' && user?.role !== 'GESTOR') {
          const err: any = new Error('Solo la inmobiliaria dueña de la prioridad puede reservar este lote');
          err.status = 403;
          throw err;
        }
      }
    }

    // Validar que el cliente exista y esté ACTIVA (soft delete)
    const clienteExists = await prisma.persona.findUnique({
      where: { id: body.clienteId },
    });
    if (!clienteExists) {
      const err: any = new Error('Cliente no encontrado');
      err.status = 404;
      throw err;
    }
    if (clienteExists.estadoOperativo !== EstadoOperativo.OPERATIVO) {
      const err: any = new Error('No se puede crear una reserva con un cliente inactivo');
      err.status = 400;
      throw err;
    }

    // Si el usuario es INMOBILIARIA, usar siempre su inmobiliariaId
    let inmobiliariaIdFinal = body.inmobiliariaId ?? null;
    if (user?.role === 'INMOBILIARIA') {
      if (!user.inmobiliariaId) {
        throw new Error("El usuario INMOBILIARIA no tiene una inmobiliaria asociada.");
      }
      inmobiliariaIdFinal = user.inmobiliariaId;
    }

    // Guardar el estado original del lote antes de crear la reserva (para restaurarlo al finalizar)
    const estadoOriginalLote = lote.estado;

    // Guardamos el estado original del lote para restaurarlo al finalizar la reserva
    const row = await prisma.reserva.create({
      data: {
        fechaReserva: new Date(body.fechaReserva), // ISO -> Date
        loteId: body.loteId,
        clienteId: body.clienteId,
        inmobiliariaId: inmobiliariaIdFinal,
        // Para Decimal no necesito new Decimal: Prisma acepta number|string
        ...(body.sena !== undefined ? { sena: body.sena } : {}),
        estado: EstadoReserva.ACTIVA, // Asigno estado por defecto como ACTIVA
        numero: body.numero, // Número de reserva
        fechaFinReserva: new Date(body.fechaFinReserva), // ISO -> Date
        loteEstadoAlCrear: estadoOriginalLote, // Guardamos el estado original del lote
      },
    });

    // Cambiar lote a RESERVADO
    await updateLoteState(body.loteId, ESTADO_LOTE_OP.RESERVADO);

    // Si el lote estaba CON_PRIORIDAD, cancelar la prioridad activa (reserva consume prioridad)
    if (estadoOriginalLote === EstadoLote.CON_PRIORIDAD) {
      await cancelPrioridadActivaOnReserva(body.loteId);
    }

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
    estado: EstadoReserva;
    clienteId: number;
    inmobiliariaId: number | null;
    sena: number;
    numero: string;
    fechaFinReserva: string;
  }>,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  try {
    // Obtener reserva actual para validaciones
    const reservaActual = await prisma.reserva.findUnique({
      where: { id },
      select: { estado: true, inmobiliariaId: true, loteId: true, loteEstadoAlCrear: true, ventaId: true }
    });

    if (!reservaActual) {
      const err: any = new Error('La reserva no existe');
      err.status = 404;
      throw err;
    }

    // BLOQUEO CRÍTICO: Si la reserva está consumida por una venta, no se puede modificar el estado
    if (reservaActual.ventaId != null && body.estado !== undefined) {
      const err: any = new Error('Esta reserva ya fue consumida por una venta y no se puede modificar su estado');
      err.status = 400;
      throw err;
    }

    // Validar expiración: solo puede aplicarse si la reserva estaba ACTIVA
    if (body.estado !== undefined && body.estado === EstadoReserva.EXPIRADA) {
      if (reservaActual.estado !== EstadoReserva.ACTIVA) {
        const err: any = new Error('Solo se puede marcar como EXPIRADA una reserva que está ACTIVA');
        err.status = 400;
        throw err;
      }
    }

    // Validar rechazo: solo puede aplicarse desde ACTIVA o ACEPTADA
    if (body.estado !== undefined && body.estado === EstadoReserva.RECHAZADA) {
      if (reservaActual.estado !== EstadoReserva.ACTIVA && reservaActual.estado !== EstadoReserva.ACEPTADA) {
        const err: any = new Error('Solo se puede rechazar una reserva que está ACTIVA o ACEPTADA');
        err.status = 400;
        throw err;
      }
    }

    // Validar permisos y restricciones para INMOBILIARIA
    if (user?.role === 'INMOBILIARIA') {
      // Validar que la reserva pertenece a la inmobiliaria del usuario
      if (reservaActual.inmobiliariaId !== user.inmobiliariaId) {
        const err: any = new Error('No puedes modificar esta reserva');
        err.status = 403;
        throw err;
      }

      // Validar cambio de estado: solo puede cambiar a CANCELADA y solo si está ACTIVA
      if (body.estado !== undefined) {
        if (reservaActual.estado === EstadoReserva.CANCELADA) {
          const err: any = new Error('No se puede cambiar el estado de una reserva cancelada');
          err.status = 400;
          throw err;
        }
        // INMOBILIARIA solo puede cancelar si la reserva está ACTIVA (no ACEPTADA)
        if (reservaActual.estado !== EstadoReserva.ACTIVA) {
          const err: any = new Error('Solo puedes cancelar una reserva que está ACTIVA. Las reservas ACEPTADAS solo pueden ser gestionadas por Administradores o Gestores');
          err.status = 403;
          throw err;
        }
        if (body.estado !== EstadoReserva.CANCELADA) {
          const err: any = new Error('Solo se puede cambiar el estado a "Cancelada"');
          err.status = 400;
          throw err;
        }
      }

      // Filtrar campos permitidos para INMOBILIARIA (similar a TECNICO en updatedLote)
      const allowedFields = ['fechaReserva', 'clienteId', 'sena', 'estado', 'fechaFinReserva'];
      const filtered: Record<string, any> = {};
      Object.keys(body || {}).forEach((field) => {
        if (allowedFields.includes(field)) {
          filtered[field] = body[field as keyof typeof body];
        }
      });
      body = filtered as typeof body;
    }

    // Impedir cambiar loteId para evitar restaurar lote equivocado
    if (body.loteId !== undefined && body.loteId !== reservaActual.loteId) {
      const err: any = new Error('No se puede cambiar el loteId de una reserva');
      err.status = 400;
      throw err;
    }

    // Construir dataToUpdate
    const dataToUpdate: any = {};
    if (body.fechaReserva !== undefined) {
      dataToUpdate.fechaReserva = new Date(body.fechaReserva);
    }
    if (body.clienteId !== undefined) {
      dataToUpdate.clienteId = body.clienteId;
    }
    if (body.inmobiliariaId !== undefined) {
      dataToUpdate.inmobiliariaId = body.inmobiliariaId;
    }
    if (body.sena !== undefined) {
      dataToUpdate.sena = body.sena;
    }
    if (body.estado !== undefined) {
      dataToUpdate.estado = body.estado;
    }
    if (body.numero !== undefined) {
      dataToUpdate.numero = body.numero;
    }
    if (body.fechaFinReserva !== undefined) {
      dataToUpdate.fechaFinReserva = new Date(body.fechaFinReserva);
    }

    const row = await prisma.reserva.update({
      where: { id },
      data: dataToUpdate,
      include: {
        cliente: {
          select: { id: true, nombre: true, apellido: true },
        },
        inmobiliaria: {
          select: { id: true, nombre: true },
        },
        lote: { select: { id: true, precio: true, mapId: true, numero: true, fraccion: { select: { numero: true } } } },
      },
    });

    // Sincronizar estado del lote con el estado de la reserva
    if (body.estado !== undefined) {
      if (body.estado === EstadoReserva.CANCELADA || body.estado === EstadoReserva.RECHAZADA || body.estado === EstadoReserva.EXPIRADA) {
        // Si la reserva termina, restauramos el estado original usando regla centralizada
        const estadoARestaurar = await computeRestoreStateFromReserva(reservaActual.loteEstadoAlCrear, row.loteId);
        await updateLoteState(row.loteId, estadoARestaurar); 
      } else if (body.estado === EstadoReserva.ACTIVA) {
        // Si la reserva se establece como ACTIVA, cambiar el estado del lote a "RESERVADO"
        await updateLoteState(row.loteId, ESTADO_LOTE_OP.RESERVADO);
      }
      // Si es ACEPTADA, no cambiamos automáticamente el estado del lote
      // porque podría estar VENDIDO (la reserva aceptada puede derivar en venta)
    }
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
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      select: { estado: true, loteId: true, loteEstadoAlCrear: true },
    });

    if (!reserva) {
      const err: any = new Error('La reserva no existe');
      err.status = 404;
      throw err;
    }

    await prisma.reserva.delete({ where: { id } });

    // Si la reserva estaba activa, restauramos el estado original del lote usando regla centralizada
    if (reserva.estado === EstadoReserva.ACTIVA && reserva.loteId) {
      const estadoARestaurar = await computeRestoreStateFromReserva(reserva.loteEstadoAlCrear, reserva.loteId);
      await updateLoteState(reserva.loteId, estadoARestaurar);
    }
  } catch (e) {
    throw mapPrismaError(e);
  }
}
// ==============================
// Eliminar reserva (Soft Delete - estadoOperativo)
// ==============================
// Solo permite eliminar reservas en estados: CANCELADA, EXPIRADA, RECHAZADA
// NO modifica el lote ni el estado comercial de la reserva
export async function eliminarReserva(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  try {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, nombre: true, apellido: true },
        },
        inmobiliaria: {
          select: { id: true, nombre: true },
        },
        lote: {
          select: { 
            id: true, 
            precio: true, 
            mapId: true,
            numero: true,
            fraccion: {
              select: { numero: true }
            }
          },
        },
      },
    });

    if (!reserva) {
      const err: any = new Error('La reserva no existe');
      err.statusCode = 404;
      throw err;
    }

    // Validar permisos: INMOBILIARIA solo puede eliminar sus propias reservas
    if (user?.role === 'INMOBILIARIA' && user?.inmobiliariaId != null) {
      if (reserva.inmobiliariaId !== user.inmobiliariaId) {
        const err: any = new Error('No tienes permiso para eliminar esta reserva');
        err.statusCode = 403;
        throw err;
      }
    }

    // Validar que no esté ya eliminada
    if (reserva.estadoOperativo === 'ELIMINADO') {
      const err: any = new Error('La reserva ya está eliminada.');
      err.statusCode = 409;
      throw err;
    }

    // Validar que el estado permita eliminación lógica
    // Solo se puede eliminar si está en: CANCELADA, EXPIRADA, RECHAZADA
    const estadosPermitidos = [EstadoReserva.CANCELADA, EstadoReserva.EXPIRADA, EstadoReserva.RECHAZADA];
    if (!estadosPermitidos.includes(reserva.estado)) {
      const err: any = new Error(`No se puede eliminar una reserva en estado ${reserva.estado}. Solo se pueden eliminar reservas en estado CANCELADA, EXPIRADA o RECHAZADA.`);
      err.statusCode = 409;
      throw err;
    }

    // Eliminar lógicamente: solo cambia estadoOperativo a ELIMINADO
    // NO modifica el estado comercial ni el lote
    const row = await prisma.reserva.update({
      where: { id },
      data: {
        estadoOperativo: 'ELIMINADO',
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, apellido: true },
        },
        inmobiliaria: {
          select: { id: true, nombre: true },
        },
        lote: {
          select: { 
            id: true, 
            precio: true, 
            mapId: true,
            numero: true,
            fraccion: {
              select: { numero: true }
            }
          },
        },
      },
    });

    return row;
  } catch (e: any) {
    if (e.statusCode) {
      throw e;
    }
    throw mapPrismaError(e);
  }
}

// ==============================
// Reactivar reserva (estadoOperativo)
// ==============================
export async function reactivarReserva(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<any> {
  try {
    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, nombre: true, apellido: true },
        },
        inmobiliaria: {
          select: { id: true, nombre: true },
        },
        lote: {
          select: { 
            id: true, 
            precio: true, 
            mapId: true,
            numero: true,
            fraccion: {
              select: { numero: true }
            }
          },
        },
      },
    });

    if (!reserva) {
      const err: any = new Error('La reserva no existe');
      err.statusCode = 404;
      throw err;
    }

    // Validar permisos: INMOBILIARIA solo puede reactivar sus propias reservas
    if (user?.role === 'INMOBILIARIA' && user?.inmobiliariaId != null) {
      if (reserva.inmobiliariaId !== user.inmobiliariaId) {
        const err: any = new Error('No tienes permiso para reactivar esta reserva');
        err.statusCode = 403;
        throw err;
      }
    }

    // Validar que no esté ya operativa
    if (reserva.estadoOperativo === 'OPERATIVO') {
      const err: any = new Error('La reserva ya está operativa.');
      err.statusCode = 409;
      throw err;
    }

    // Reactivar: solo cambia estadoOperativo a OPERATIVO (no valida lote disponible, plazos, etc.)
    const updated = await prisma.reserva.update({
      where: { id },
      data: {
        estadoOperativo: 'OPERATIVO',
      },
      include: {
        cliente: {
          select: { id: true, nombre: true, apellido: true },
        },
        inmobiliaria: {
          select: { id: true, nombre: true },
        },
        lote: {
          select: { 
            id: true, 
            precio: true, 
            mapId: true,
            numero: true,
            fraccion: {
              select: { numero: true }
            }
          },
        },
      },
    });

    return updated;
  } catch (e: any) {
    if (e.statusCode) {
      throw e;
    }
    throw mapPrismaError(e);
  }
}
