import prisma from '../config/prisma';
import { Venta, EstadoReserva, EstadoPrioridad } from '../generated/prisma';
import { PostVentaRequest, PutVentaRequest, DeleteVentaResponse } from '../types/interfacesCCLF'; 
import { updateLoteState } from './lote.service';
import { ESTADO_LOTE_OP } from '../domain/loteState/loteState.types';
import { assertLoteOperableFor } from '../domain/loteState/loteState.rules';
import { finalizePrioridadActivaOnVenta } from '../domain/loteState/loteState.effects';


export async function getAllVentas(): Promise<Venta[]> {
    const ventas = await prisma.venta.findMany({
        include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true }, 
        orderBy: { id: 'asc' }, // Ordenar por idVenta de forma ascendente
    });

    return ventas;
}

export async function getVentaById(id: number): Promise<Venta> {
    const venta = await prisma.venta.findUnique({
        where: { id },
        include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true },
    });

    if (!venta) {
        const error = new  Error('Venta no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    return venta;

}

export async function getVentasByInmobiliaria(inmobiliariaId: number): Promise<Venta[]> {
    const ventas = await prisma.venta.findMany({
        where: { inmobiliariaId },
        include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true },
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

    const newVenta = await prisma.venta.create({
        data: {
            loteId: data.loteId,
            fechaVenta: new Date(data.fechaVenta),
            monto: data.monto,
            estado: data.estado || 'INICIADA',
            estadoCobro: data.estadoCobro || 'PENDIENTE', // Si viene en request, usarlo; si no, PENDIENTE
            plazoEscritura: data.plazoEscritura ? new Date(data.plazoEscritura) : null,
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
        select: { estado: true, loteId: true }
    });

    if (!ventaActual) {
        const error = new Error('Venta no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    // Validar cancelación: no se puede cancelar una venta ESCRITURADO
    if (updateData.estado === 'CANCELADA' && ventaActual.estado === 'ESCRITURADO') {
        const error = new Error('No se puede cancelar una venta que ya está escriturada');
        (error as any).statusCode = 400;
        throw error;
    }

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
        const updatedVenta = await prisma.venta.update({
            where: { id }, 
            data: updateData,
            include: { 
                comprador: true, 
                lote: { include: { propietario: true } }, 
                inmobiliaria: true 
            }, // Incluir todas las relaciones como en getVentaById
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

export async function desactivarVenta(id: number): Promise<Venta> {
    const venta = await prisma.venta.findUnique({ where: { id } });
    if (!venta) {
        const error = new Error('Venta no encontrada') as any;
        error.statusCode = 404;
        throw error;
    }

    if (venta.estado === 'ELIMINADO') {
        const error = new Error('La venta ya está eliminada') as any;
        error.statusCode = 400;
        throw error;
    }

    // Al eliminar (lógico), liberamos el lote si estaba vendido?
    // "Eliminar una venta" conceptualmente anula la operación. 
    // Si es "papelera de reciclaje", quizás no deberíamos liberar el lote todavía hasta que sea defintivo?
    // PERO: Si el usuario borra la venta, espera que el lote quede libre.
    // Sin embargo, Venta tiene estados complejos (cancelada, etc).
    // Si usamos ELIMINADO como "papelera", quizás deberíamos mantener el lote ocupado?
    // En Personas/Inmobiliarias, eliminar es "ocultar".
    // En Venta, es transaccional.
    // Voy a asumir que desactivar es solo "soft delete" y NO altera el lote por ahora, 
    // SALVO que el usuario pida explicitamente anular la venta (que seria CANCELADA).
    // Pero espera, el usuario quiere "eliminacion logica".
    // Si elimino logicamente, ¿aparece en los listados? Normalmente no.
    // Si no aparece, y el lote sigue VENDIDO, es un problema de integridad.
    // Si la venta se elimina, el lote debería volver a DISPONIBLE?
    // Eso ya lo hace "CANCELADA".
    // "ELIMINADO" suele ser "borré este registro por error" o "ya no interesa".
    // Voy a hacer que cambie el estado y ponga fechaBaja, sin tocar el lote automágicamente, 
    // para evitar efectos secundarios peligrosos. El usuario debería Cancelar primero si quiere liberar.

    return await prisma.venta.update({
        where: { id },
        data: {
            estado: 'ELIMINADO',
            estadoPrevio: venta.estado,
            fechaBaja: new Date(),
        },
        include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true },
    });
}

export async function reactivarVenta(id: number): Promise<Venta> {
    const venta = await prisma.venta.findUnique({ where: { id } });
    if (!venta) {
        const error = new Error('Venta no encontrada') as any;
        error.statusCode = 404;
        throw error;
    }

    if (venta.estado !== 'ELIMINADO') {
        const error = new Error('La venta no está eliminada') as any;
        error.statusCode = 400;
        throw error;
    }

    // Al reactivar, volvemos a INICIADA o OPERATIVO?
    // Dado que el sistema usa INICIADA como default, y OPERATIVO es el genérico...
    // Voy a usar INICIADA si no tengo historial, o OPERATIVO si queremos ser consistentes con "Active".
    // Pero EstadoVenta tiene INICIADA, CON_BOLETO...
    // Si estaba ESCRITURADO y lo borré, y lo reactivo... volver a INICIADA es perder datos.
    // Como no guardé el "estadoAnterior", tengo un problema.
    // ASUMIRÉ: Volver a OPERATIVO (si el enum lo tiene, que sí lo tiene). 
    // El usuario podrá cambiarlo manualmente después.

    const nuevoEstado = venta.estadoPrevio || 'INICIADA';

    return await prisma.venta.update({
        where: { id },
        data: {
            estado: nuevoEstado,
            estadoPrevio: null,
            fechaBaja: null,
        },
        include: { comprador: true, lote: { include: { propietario: true } }, inmobiliaria: true },
    });
}

