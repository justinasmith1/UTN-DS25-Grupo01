import prisma from '../config/prisma';
import { Venta } from '../generated/prisma';
import { GetVentasResponse, GetVentaRequest, GetVentaResponse, PostVentaRequest, PostVentaResponse, PutVentaRequest, PutVentaResponse
, DeleteVentaRequest, DeleteVentaResponse, Persona } from '../types/interfacesCCLF'; 

export async function getAllVentas(): Promise<Venta[]> {
    const ventas = await prisma.venta.findMany({
        include: { comprador: true }, // Incluir datos del comprador
        orderBy: { id: 'asc' }, // Ordenar por idVenta de forma ascendente
    });
    return ventas;
}

export async function getVentaById(id: number): Promise<Venta> {
    const venta = await prisma.venta.findUnique({
        where: { id },
        include: { comprador: true }, // Incluir datos del comprador
    });

    if (!venta) {
        const error = new  Error('Venta no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    return venta;

}

export async function createVenta(data: PostVentaRequest): Promise<Venta> {
    if (data.monto <= 0) {
        const error = new Error('El monto debe ser un número positivo');
        (error as any).statusCode = 400;
        throw error;
    }
    // Excluir 'lote' y 'comprador' del objeto data si no son parte de VentaCreateInput
    const { lote, ...ventaData } = data;
    const newVenta = await prisma.venta.create({
        data: {
            ...ventaData,
        },
        include: { comprador: true }, // Incluir datos del comprador
    });
    return newVenta;
}

export async function updateVenta(id: number, updateData: PutVentaRequest): Promise<Venta> {
    if (updateData.monto !== undefined && updateData.monto <= 0) {
        const error = new Error('El monto total debe ser un número positivo');
        (error as any).statusCode = 400;
        throw error;
    }
    try{
        const updatedVenta = await prisma.venta.update({
        where: { id },
        data: {
            ...(updateData.compradorId !== undefined ? { compradorId: updateData.compradorId } : {}),
            ...(updateData.loteId !== undefined ? { loteId: updateData.loteId } : {}),
            ...(updateData.monto !== undefined ? { monto: updateData.monto } : {}),
            ...(updateData.fechaVenta !== undefined ? { fechaVenta: new Date(updateData.fechaVenta) } : {}),
            ...(updateData.estado !== undefined ? { estado: updateData.estado } : {}),
            ...(updateData.plazoEscritura !== undefined ? { plazoEscritura: new Date(updateData.plazoEscritura) } : {}),
            ...(updateData.tipoPago !== undefined ? { tipoPago: updateData.tipoPago } : {}),
            ...(updateData.vendedorId !== undefined ? { vendedorId: updateData.vendedorId } : {}),
            updateAt: new Date(), // Actualizar la fecha de modificación
        },
        include: { comprador: true }, // Incluir datos del comprador
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

