import prisma from '../config/prisma';
import { Venta, EstadoReserva, EstadoPrioridad } from '../generated/prisma';
import { PostVentaRequest, PutVentaRequest, DeleteVentaResponse } from '../types/interfacesCCLF'; 
import { updateLoteState } from './lote.service';
import { ESTADO_LOTE_OP } from '../domain/loteState/loteState.types';
import { assertLoteOperableFor } from '../domain/loteState/loteState.rules';
import { finalizePrioridadActivaOnVenta } from '../domain/loteState/loteState.effects';
import { 
    assertTransicionEstadoValida, 
    assertCamposObligatoriosPorEstado 
} from '../domain/ventaState/ventaState.rules';
import { isVentaFinalizada } from '../domain/ventaState/ventaState.types';


export async function getAllVentas(
  query?: { estadoOperativo?: string },
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<Venta[]> {
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

    const ventas = await prisma.venta.findMany({
        where: whereClause,
        include: { comprador: true, lote: { include: { propietario: true, fraccion: { select: { numero: true } } } }, inmobiliaria: true }, 
        orderBy: { id: 'asc' }, // Ordenar por idVenta de forma ascendente
    });

    return ventas;
}

export async function getVentaById(id: number): Promise<Venta> {
    const venta = await prisma.venta.findUnique({
        where: { id },
        include: { comprador: true, lote: { include: { propietario: true, fraccion: { select: { numero: true } } } }, inmobiliaria: true },
    });

    if (!venta) {
        const error = new  Error('Venta no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    return venta;

}

export async function getVentasByInmobiliaria(
  inmobiliariaId: number,
  query?: { estadoOperativo?: string }
): Promise<Venta[]> {
    const whereClause: any = { inmobiliariaId };

    // Filtro estadoOperativo: default OPERATIVO si no viene
    if (query?.estadoOperativo) {
      whereClause.estadoOperativo = query.estadoOperativo;
    } else {
      whereClause.estadoOperativo = 'OPERATIVO'; // Default: solo operativas
    }

    const ventas = await prisma.venta.findMany({
        where: whereClause,
        include: { comprador: true, lote: { include: { propietario: true, fraccion: { select: { numero: true } } } }, inmobiliaria: true },
        orderBy: { fechaVenta: 'desc' },
    });
    if (ventas.length === 0) {
        const error = new Error('No se registran ventas para la inmobiliaria indicada') as any;
        error.statusCode = 404;
        throw error;
    }
    return ventas;
}

export async function createVenta(data: PostVentaRequest): Promise<Venta> {
    const loteExists = await prisma.lote.findUnique({
        where: { id: data.loteId },
    });

    if (!loteExists) {
        const error = new Error('Lote no encontrado');
        (error as any).statusCode = 404;
        throw error;
    }
    if (loteExists.estado === 'VENDIDO') {
        const error = new Error('El lote ya está vendido');
        (error as any).statusCode = 400;
        throw error;
    }
    // Validar que el lote esté operativo (bloquea NO_DISPONIBLE)
    assertLoteOperableFor('crear venta', loteExists.estado);
    // Nota: No se bloquea la venta de lotes alquilados según requerimientos
    // Obtener la reserva asociada al lote (si existe y está aceptada)
    const reserva = await prisma.reserva.findFirst({
      where: {
        loteId: data.loteId,
        estado: EstadoReserva.ACEPTADA,
      },
    });

    // Si hay una reserva ACEPTADA, validar los datos
    if (reserva) {
        if (reserva.inmobiliariaId) {
            if (reserva.inmobiliariaId !== data.inmobiliariaId) {
                throw new Error("La inmobiliaria de la venta no coincide con la de la reserva.");
            }
        } 
      
      if (reserva.clienteId !== data.compradorId) {
        throw new Error("El cliente de la venta no coincide con el de la reserva.");
      }
    }

    const compradorExists = await prisma.persona.findUnique({
        where: { id: data.compradorId },
    });
    if (!compradorExists) {
        const error = new Error('Comprador no encontrado');
        (error as any).statusCode = 404;
        throw error;
    }

    // Validar campos obligatorios según estado inicial (si viene estado diferente a INICIADA)
    const estadoInicial = data.estado || 'INICIADA';
    assertCamposObligatoriosPorEstado(estadoInicial as any, {
        fechaEscrituraReal: data.fechaEscrituraReal ? new Date(data.fechaEscrituraReal) : null,
        fechaCancelacion: data.fechaCancelacion ? new Date(data.fechaCancelacion) : null,
        motivoCancelacion: data.motivoCancelacion,
    } as any);

    const newVenta = await prisma.venta.create({
        data: {
            loteId: data.loteId,
            fechaVenta: new Date(data.fechaVenta),
            monto: data.monto,
            estado: estadoInicial,
            estadoCobro: data.estadoCobro || 'PENDIENTE', // Si viene en request, usarlo; si no, PENDIENTE
            plazoEscritura: data.plazoEscritura ? new Date(data.plazoEscritura) : null,
            fechaEscrituraReal: data.fechaEscrituraReal ? new Date(data.fechaEscrituraReal) : null,
            fechaCancelacion: data.fechaCancelacion ? new Date(data.fechaCancelacion) : null,
            motivoCancelacion: data.motivoCancelacion || null,
            tipoPago: data.tipoPago,
            compradorId: data.compradorId,
            inmobiliariaId: data.inmobiliariaId || null,
            numero: data.numero,
            createdAt: new Date(),
        },
        include: { comprador: true }, // Incluir datos del comprador
    });

    // Actualizar el estado del lote a "VENDIDO" (siempre, ya que las validaciones previas filtran casos inválidos)
    await updateLoteState(data.loteId, ESTADO_LOTE_OP.VENDIDO);
    
    // Si había prioridad activa, se finaliza al concretar la venta (efecto centralizado)
    await finalizePrioridadActivaOnVenta(data.loteId);
    
    // Asignar el ventaId a la reserva si existe una reserva ACEPTADA
    if (reserva) {
        await prisma.reserva.update({
            where: { id: reserva.id },
            data: { ventaId: newVenta.id },
        });
    }

    return newVenta;   // En lo que devuelve, no incluye idReserva, cuando vas a buscar una venta, si incluye idReserva.
}

export async function updateVenta(id: number, updateData: PutVentaRequest): Promise<Venta> {
    // Obtener venta actual para validaciones y side effects
    const ventaActual = await prisma.venta.findUnique({
        where: { id },
        select: { estado: true, estadoCobro: true, loteId: true }
    });

    if (!ventaActual) {
        const error = new Error('Venta no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    // Validar transición de estado si se está cambiando
    if (updateData.estado && updateData.estado !== ventaActual.estado) {
        assertTransicionEstadoValida(ventaActual.estado, updateData.estado as any);
    }

    // Preparar datos para validar campos obligatorios según nuevo estado
    const estadoFinal = updateData.estado || ventaActual.estado;
    const dataValidacion = {
        fechaEscrituraReal: updateData.fechaEscrituraReal ? new Date(updateData.fechaEscrituraReal) : null,
        fechaCancelacion: updateData.fechaCancelacion ? new Date(updateData.fechaCancelacion) : null,
        motivoCancelacion: updateData.motivoCancelacion,
    };

    // Validar campos obligatorios según el estado final
    assertCamposObligatoriosPorEstado(estadoFinal as any, dataValidacion as any);

    if (updateData.loteId) {
        const loteExists = await prisma.lote.findUnique({
            where: { id: updateData.loteId },
        });
        if (!loteExists) {
            const error = new Error('Lote no encontrado');
            (error as any).statusCode = 404;
            throw error;
        }
    }

    if (updateData.compradorId) {
        const compradorExists = await prisma.persona.findUnique({
            where: { id: updateData.compradorId },
        });
        if (!compradorExists) {
            const error = new Error('Comprador no encontrado');
            (error as any).statusCode = 404;
            throw error;
        }
    }

    if (updateData.inmobiliariaId) {
        const inmobiliariaExists = await prisma.inmobiliaria.findUnique({
            where: { id: updateData.inmobiliariaId },
        });
        if (!inmobiliariaExists) {
            const error = new Error('Inmobiliaria no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
    }

    try{
        // Preparar datos de actualización con conversión de fechas
        const prismaUpdateData: any = { ...updateData };
        if (updateData.fechaVenta) {
            prismaUpdateData.fechaVenta = new Date(updateData.fechaVenta);
        }
        if (updateData.plazoEscritura) {
            prismaUpdateData.plazoEscritura = new Date(updateData.plazoEscritura);
        }
        if (updateData.fechaEscrituraReal) {
            prismaUpdateData.fechaEscrituraReal = new Date(updateData.fechaEscrituraReal);
        }
        if (updateData.fechaCancelacion) {
            prismaUpdateData.fechaCancelacion = new Date(updateData.fechaCancelacion);
        }

        const updatedVenta = await prisma.venta.update({
            where: { id }, 
            data: prismaUpdateData,
            include: { comprador: true, lote: { include: { propietario: true, fraccion: { select: { numero: true } } } }, inmobiliaria: true },
        });

        // Side effect: si la venta se cancela, restaurar el lote a DISPONIBLE (siempre)
        if (updateData.estado === 'CANCELADA') {
            await updateLoteState(ventaActual.loteId, ESTADO_LOTE_OP.DISPONIBLE);
        }

        return updatedVenta;
    } catch (e: any) {
        if (e.code === 'P2025') { // Código de error de Prisma para "registro no encontrado"
            const error = new Error('Venta no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e; // Re-lanzar otros errores
    }
}

// Hard delete
export async function deleteVenta(id: number): Promise<DeleteVentaResponse> {
    try {
        await prisma.venta.delete({
            where: { id },
        });
        return { message: 'Venta eliminada correctamente' };
    } catch (e: any) {
        if (e.code === 'P2025') { 
            const error = new Error('Venta no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e;
    }
}

export async function eliminarVenta(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<Venta> {
    const venta = await prisma.venta.findUnique({ 
      where: { id },
      include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true },
    });
    
    if (!venta) {
        const error = new Error('Venta no encontrada') as any;
        error.statusCode = 404;
        throw error;
    }

    // Validar permisos: INMOBILIARIA solo puede eliminar sus propias ventas
    if (user?.role === 'INMOBILIARIA' && user?.inmobiliariaId != null) {
      if (venta.inmobiliariaId !== user.inmobiliariaId) {
        const error = new Error('No tienes permiso para eliminar esta venta') as any;
        error.statusCode = 403;
        throw error;
      }
    }

    if (venta.estadoOperativo === 'ELIMINADO') {
        const error = new Error('La venta ya está eliminada.') as any;
        error.statusCode = 409;
        throw error;
    }

    // Validar regla de negocio: solo se puede eliminar si CANCELADA o FINALIZADA
    const ventaData = {
        estado: venta.estado,
        estadoCobro: venta.estadoCobro,
        fechaEscrituraReal: venta.fechaEscrituraReal,
        fechaCancelacion: venta.fechaCancelacion,
        motivoCancelacion: venta.motivoCancelacion,
    };

    // Esta función lanza error si no se puede eliminar
    try {
        const { assertVentaEliminable } = await import('../domain/ventaState/ventaState.rules');
        assertVentaEliminable(ventaData);
    } catch (err: any) {
        // Re-lanzar con statusCode si no lo tiene
        if (!err.statusCode && !err.status) {
            err.statusCode = 409;
        }
        throw err;
    }

    return await prisma.venta.update({
        where: { id },
        data: {
            estadoOperativo: 'ELIMINADO',
            fechaBaja: new Date(),
        },
        include: { comprador: true, lote: { include: { propietario: true, fraccion: { select: { numero: true } } } }, inmobiliaria: true },
    });
}

export async function reactivarVenta(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<Venta> {
    const venta = await prisma.venta.findUnique({ 
      where: { id },
      include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true },
    });
    
    if (!venta) {
        const error = new Error('Venta no encontrada') as any;
        error.statusCode = 404;
        throw error;
    }

    // Validar permisos: INMOBILIARIA solo puede reactivar sus propias ventas
    if (user?.role === 'INMOBILIARIA' && user?.inmobiliariaId != null) {
      if (venta.inmobiliariaId !== user.inmobiliariaId) {
        const error = new Error('No tienes permiso para reactivar esta venta') as any;
        error.statusCode = 403;
        throw error;
      }
    }

    if (venta.estadoOperativo === 'OPERATIVO') {
        const error = new Error('La venta ya está operativa.') as any;
        error.statusCode = 409;
        throw error;
    }

    // Reactivar: solo cambia estadoOperativo a OPERATIVO (no valida lote disponible, plazos, etc.)
    return await prisma.venta.update({
        where: { id },
        data: {
            estadoOperativo: 'OPERATIVO',
        },
        include: { comprador: true, lote: { include: { propietario: true, fraccion: { select: { numero: true } } } }, inmobiliaria: true },
    });
}

