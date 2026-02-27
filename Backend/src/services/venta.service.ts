import prisma from '../config/prisma';
import { Venta, EstadoReserva, EstadoPrioridad } from '../generated/prisma';
import { PostVentaRequest, PutVentaRequest, DeleteVentaResponse } from '../types/interfacesCCLF'; 
import { updateLoteState } from './lote.service';
import { ESTADO_LOTE_OP } from '../domain/loteState/loteState.types';
import { assertLoteOperableFor } from '../domain/loteState/loteState.rules';
import { finalizePrioridadActivaOnVenta } from '../domain/loteState/loteState.effects';
import { 
    assertTransicionEstadoValida, 
    assertCamposObligatoriosPorEstado,
    assertVentaEliminable
} from '../domain/ventaState/ventaState.rules';
import { isVentaFinalizada } from '../domain/ventaState/ventaState.types';

// Include estándar para ventas (Etapa 4: compradores[] vía relación implícita + comprador legacy)
const VENTA_INCLUDE = {
    comprador: true, // Legacy — se mantiene hasta Fase 3
    compradores: true, // Etapa 4: relación implícita → devuelve Persona[] directamente
    lote: { include: { propietario: true, fraccion: { select: { numero: true } } } },
    inmobiliaria: true,
} as const;

// Helper: extraer lista de personaIds desde el payload (soporta legacy y nuevo formato)
function resolveCompradorIds(data: { compradorId?: number; compradores?: { personaId: number }[] }): number[] {
    if (data.compradores && data.compradores.length > 0) {
        return data.compradores.map(c => c.personaId);
    }
    if (data.compradorId != null) {
        return [data.compradorId];
    }
    return [];
}


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
        include: VENTA_INCLUDE,
        orderBy: { id: 'asc' },
    });

    return ventas;
}

export async function getVentaById(id: number): Promise<Venta> {
    const venta = await prisma.venta.findUnique({
        where: { id },
        include: VENTA_INCLUDE,
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
        include: VENTA_INCLUDE,
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

    // Resolver lista de compradores (soporta legacy compradorId y nuevo compradores[])
    const compradorIds = resolveCompradorIds(data);
    if (compradorIds.length === 0) {
        const error = new Error('Debe especificar al menos un comprador');
        (error as any).statusCode = 400;
        throw error;
    }

    // Verificar que todas las personas existen
    for (const personaId of compradorIds) {
        const personaExists = await prisma.persona.findUnique({ where: { id: personaId } });
        if (!personaExists) {
            const error = new Error(`Comprador no encontrado (personaId: ${personaId})`);
            (error as any).statusCode = 404;
            throw error;
        }
    }

    // El compradorId principal (legacy): el primero de la lista
    const compradorIdPrincipal = compradorIds[0];

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
        // Etapa 4: el clienteId de la reserva debe estar entre los compradores
        if (!compradorIds.includes(reserva.clienteId)) {
            throw new Error("El cliente de la reserva debe estar incluido en la lista de compradores de la venta.");
        }
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
            estadoCobro: data.estadoCobro || 'PENDIENTE',
            plazoEscritura: data.plazoEscritura ? new Date(data.plazoEscritura) : null,
            fechaEscrituraReal: data.fechaEscrituraReal ? new Date(data.fechaEscrituraReal) : null,
            fechaCancelacion: data.fechaCancelacion ? new Date(data.fechaCancelacion) : null,
            motivoCancelacion: data.motivoCancelacion || null,
            tipoPago: data.tipoPago,
            compradorId: compradorIdPrincipal, // Legacy: primer comprador
            inmobiliariaId: data.inmobiliariaId || null,
            numero: data.numero,
            createdAt: new Date(),
            // Etapa 4: conectar compradores vía relación implícita
            compradores: {
                connect: compradorIds.map(id => ({ id })),
            },
        },
        include: VENTA_INCLUDE,
    });

    // Actualizar el estado del lote a "VENDIDO"
    await updateLoteState(data.loteId, ESTADO_LOTE_OP.VENDIDO);
    
    // Si había prioridad activa, se finaliza al concretar la venta
    await finalizePrioridadActivaOnVenta(data.loteId);
    
    // Asignar el ventaId a la reserva si existe una reserva ACEPTADA
    if (reserva) {
        await prisma.reserva.update({
            where: { id: reserva.id },
            data: { ventaId: newVenta.id },
        });
    }

    return newVenta;
}

export async function updateVenta(id: number, updateData: PutVentaRequest): Promise<Venta> {
    // Obtener venta actual para validaciones y side effects
    const ventaActual = await prisma.venta.findUnique({
        where: { id },
        select: { 
            estado: true, 
            estadoCobro: true, 
            loteId: true,
            estadoOperativo: true,
            fechaEscrituraReal: true,
            fechaCancelacion: true,
            motivoCancelacion: true
        }
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

    // Etapa 4: Si se envían compradores[], validar que se puede editar
    if (updateData.compradores !== undefined) {
        const estadoActual = ventaActual.estado;
        const esTerminal = estadoActual === 'ESCRITURADO' || estadoActual === 'CANCELADA';
        const esEliminado = ventaActual.estadoOperativo === 'ELIMINADO';
        
        if (esTerminal || esEliminado) {
            const error = new Error(`No se puede modificar los compradores: la venta está en estado ${estadoActual}`);
            (error as any).statusCode = 409;
            throw error;
        }
    }

    // Preparar datos para validar campos obligatorios según estado final (merge DB + payload)
    const estadoFinal = updateData.estado || ventaActual.estado;
    
    const fechaEscrituraRealFinal = updateData.fechaEscrituraReal 
        ? new Date(updateData.fechaEscrituraReal) 
        : ventaActual.fechaEscrituraReal;
    
    const fechaCancelacionFinal = updateData.fechaCancelacion 
        ? new Date(updateData.fechaCancelacion) 
        : ventaActual.fechaCancelacion;
    
    const motivoCancelacionFinal = updateData.motivoCancelacion !== undefined
        ? updateData.motivoCancelacion
        : ventaActual.motivoCancelacion;
    
    const dataValidacion = {
        fechaEscrituraReal: fechaEscrituraRealFinal,
        fechaCancelacion: fechaCancelacionFinal,
        motivoCancelacion: motivoCancelacionFinal,
    };

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

    // Validar legacy compradorId si viene
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

    // Etapa 4: Validar que todos los personaIds en compradores[] existen
    if (updateData.compradores && updateData.compradores.length > 0) {
        for (const c of updateData.compradores) {
            const personaExists = await prisma.persona.findUnique({ where: { id: c.personaId } });
            if (!personaExists) {
                const error = new Error(`Comprador no encontrado (personaId: ${c.personaId})`);
                (error as any).statusCode = 404;
                throw error;
            }
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

    try {
        // Preparar datos de actualización excluyendo el campo 'compradores' (se maneja aparte)
        const { compradores: compradoresPayload, ...restUpdateData } = updateData as any;
        const prismaUpdateData: any = { ...restUpdateData };

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

        // Etapa 4: si viene compradores[], reemplazar la lista completa usando set (relación implícita)
        if (compradoresPayload && compradoresPayload.length > 0) {
            prismaUpdateData.compradores = {
                set: compradoresPayload.map((c: { personaId: number }) => ({ id: c.personaId })),
            };
            // Actualizar compradorId legacy con el primero de la lista
            prismaUpdateData.compradorId = compradoresPayload[0].personaId;
        }

        const updatedVenta = await prisma.venta.update({
            where: { id }, 
            data: prismaUpdateData,
            include: VENTA_INCLUDE,
        });

        // Side effect: si la venta se cancela, restaurar el lote a DISPONIBLE
        if (updateData.estado === 'CANCELADA') {
            await updateLoteState(ventaActual.loteId, ESTADO_LOTE_OP.DISPONIBLE);
        }

        return updatedVenta;
    } catch (e: any) {
        if (e.code === 'P2025') {
            const error = new Error('Venta no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e;
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
      include: VENTA_INCLUDE,
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

    const ventaData = {
        estado: venta.estado,
        estadoCobro: venta.estadoCobro,
        fechaEscrituraReal: venta.fechaEscrituraReal,
        fechaCancelacion: venta.fechaCancelacion,
        motivoCancelacion: venta.motivoCancelacion,
    };

    try {
        assertVentaEliminable(ventaData);
    } catch (err: any) {
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
        include: VENTA_INCLUDE,
    });
}

export async function reactivarVenta(
  id: number,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<Venta> {
    const venta = await prisma.venta.findUnique({ 
      where: { id },
      include: VENTA_INCLUDE,
    });
    
    if (!venta) {
        const error = new Error('Venta no encontrada') as any;
        error.statusCode = 404;
        throw error;
    }

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

    return await prisma.venta.update({
        where: { id },
        data: {
            estadoOperativo: 'OPERATIVO',
        },
        include: VENTA_INCLUDE,
    });
}
