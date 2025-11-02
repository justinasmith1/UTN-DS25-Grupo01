import prisma from '../config/prisma';
import { Venta, EstadoReserva } from '../generated/prisma';
import { PostVentaRequest, PutVentaRequest, DeleteVentaResponse } from '../types/interfacesCCLF'; 
import { updateLoteState } from './lote.service';


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
    if (loteExists.estado == 'NO_DISPONIBLE') {
        const error = new Error('El lote no está disponible para la venta');
        (error as any).statusCode = 400;
        throw error;
    }
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
            plazoEscritura: data.plazoEscritura ? new Date(data.plazoEscritura) : null,
            tipoPago: data.tipoPago,
            compradorId: data.compradorId,
            inmobiliariaId: data.inmobiliariaId || null,
            createdAt: new Date(),
        },
        include: { comprador: true }, // Incluir datos del comprador
    });

    // Actualizar el estado del lote a "VENDIDO"
    if (loteExists.estado == 'DISPONIBLE' || loteExists.estado == 'RESERVADO'){
        await updateLoteState(data.loteId, 'Vendido');
    }
    // Asgignar la reservaId si existe una reserva ACEPTADA
    if (reserva) {
        await prisma.venta.update({
        where: { id: newVenta.id },
        data: { reservaId: reserva.id },
      });
    }

    return newVenta;   // En lo que devuelve, no incluye idReserva, cuando vas a buscar una venta, si incluye idReserva.
}

export async function updateVenta(id: number, updateData: PutVentaRequest): Promise<Venta> {
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

export async function deleteVenta(id: number): Promise<DeleteVentaResponse> {
    try {
        await prisma.venta.delete({
            where: { id },
        });
        return { message: 'Venta eliminada correctamente' };
    } catch (e: any) {
        if (e.code === 'P2025') { // Código de error de Prisma para "registro no encontrado"
            const error = new Error('Venta no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e; // Re-lanzar otros errores
    }
}

