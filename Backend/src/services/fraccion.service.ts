import prisma from '../config/prisma';
import type { Fraccion as PrismaFraccion } from "../generated/prisma";
import type { Fraccion, DeleteFraccionResponse, DeleteFraccionRequest, GetFraccionRequest, GetFraccionesResponse, PutFraccionResponse, PostFraccionRequest, PostFraccionResponse } from '../types/interfacesCCLF';

const toFraccion = (f: PrismaFraccion & { lotes?: any[] }): Fraccion => {
    return {
        idFraccion: f.id,
        numero: f.numero,
        // Pasar los lotes incluidos desde Prisma sin remapear toda la entidad
        lotes: (f.lotes ?? []) as any,
    } as unknown as Fraccion;
}

export interface CreateFraccionDto {
    numero: number;
}

export interface UpdateFraccionDto {
    numero?: number;
}


export async function getAllFracciones(limit: number = 10): Promise<GetFraccionesResponse> {
    const [fracciones, total] = await Promise.all([
        prisma.fraccion.findMany({
            include: { lotes: true },
            orderBy: { id: 'asc' },
            take: limit
        }),
        prisma.fraccion.count()
    ]);
    return {
        fracciones: fracciones.map(f => toFraccion(f)),
        total
    };
}

export async function getFraccionById(id: number): Promise<Fraccion> {
    const fraccion = await prisma.fraccion.findUnique({
        where: { id: id },
        include: { lotes: true }
    });
    if (!fraccion) throw new Error('Fracción no encontrada');
    return toFraccion(fraccion);
}

// Crear fracción
export async function createFraccion(data: CreateFraccionDto): Promise<Fraccion> {
    // Verificar si la fracción ya existe
    const exists = await prisma.fraccion.findUnique({
        where: { numero: data.numero }
    });
    if (exists) {
        const error = new Error('La fracción ya existe') as any;
        error.statusCode = 400;
        throw error;
    }
    // Crear la fracción
    const newFraccion = await prisma.fraccion.create({
        data: {
            numero: data.numero
        }
    });
    return toFraccion(newFraccion);
}

// Actualizar fracción
export async function updateFraccion(id: number, data: UpdateFraccionDto): Promise<Fraccion> {
    try {
        // Verificar si la fracción existe
        const exists = await prisma.fraccion.findUnique({
            where: { id }
        });
        if (!exists) {
            const error = new Error('Fracción no encontrada') as any;
            error.statusCode = 404;
            throw error;
        }
        const updateData: any = {
            updatedAt: new Date()
        };

        if (data.numero !== exists.numero) {
            // Verificar si el nuevo número ya existe en otra fracción
            const numeroExists = await prisma.fraccion.findUnique({
                where: { numero: data.numero }
            });
            if (numeroExists) {
                const error = new Error('El número de fracción ya existe') as any;
                error.statusCode = 400;
                throw error;
            }
        }
        // Actualizar la fracción
        const updatedFraccion = await prisma.fraccion.update({
            where: { id },
            data: {
                numero: data.numero,
                ...updateData
            }
        });
        return toFraccion(updatedFraccion);
    } catch (e: any) {
        if (e.code === 'P2025') {
            const error = new Error('Fracción no encontrada') as any;
            error.statusCode = 404;
            throw error;
        }
        throw e;
    }
}

export async function deleteFraccion(id: number): Promise<DeleteFraccionResponse> {
    try {
        const exists = await prisma.fraccion.findUnique({
            where: { id }
        });

        if (!exists) {
            const error = new Error('Fracción no encontrada') as any;
            error.statusCode = 404;
            throw error;
        }   
        // Verificar si la fracción tiene lotes asociados
        const lotes = await prisma.lote.count({
            where: { fraccionId: id }
        });
        if (lotes > 0) {
            const error = new Error('No se puede eliminar la fracción porque tiene lotes asociados') as any;
            error.statusCode = 400;
            throw error;
        }
        await prisma.fraccion.delete({
            where: { id }
        });
        return { message: 'Fracción eliminada correctamente' };
    } catch (e: any) {
        if (e.code === 'P2025') {
        const error = new Error('Fracción no encontrada') as any;
        error.statusCode = 404;
        throw error;
        }
        throw e;
    }
}
