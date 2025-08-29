import{
    PutInmobiliariaRequest,
    PostInmobiliariaRequest,
    DeleteInmobiliariaResponse,
    PutInmobiliariaResponse
} from '../types/interfacesCCLF';
import { Inmobiliaria } from '../generated/prisma';
import prisma from '../config/prisma';
import { Prisma } from '../generated/prisma';
// ==============================
// Obtener todas las Inmobiliarias
// ==============================
// Retorna el listado completo de Inmobiliarias junto con el total.
export async function getAllInmobiliarias(): Promise<Inmobiliaria[]> {
    const inmobiliarias = await prisma.inmobiliaria.findMany({
        orderBy: { id: 'asc' }, 
    });
    return inmobiliarias;
}

// ==============================
// Obtener una Inmobiliaria por ID
// ==============================
// Busca dentro de la BD la Inmobiliaria cuyo ID coincida con el solicitado.
// Si no existe, devuelve un mensaje de error.
export async function getInmobiliariaById(id: number): Promise<Inmobiliaria> {
    const inmobiliaria = await prisma.inmobiliaria.findUnique({
        where: { id }});
    if (!inmobiliaria) {
        const error = new  Error('Inmobiliaria no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    return inmobiliaria;
}


// ==============================
// Crear nueva Inmobiliaria
// ==============================
// Agrega una nueva Inmobiliaria a la BD.
// Se hace una validacion para evitar duplicados de lote + cliente en la misma fecha.
export async function createInmobiliaria(data: PostInmobiliariaRequest): Promise<Inmobiliaria> {
    const inmobiliaria = await prisma.inmobiliaria.findFirst({
    where: { nombre: data.nombre }});
    if (inmobiliaria) {
        const error = new Error('Advertencia: Ya existe una inmobiliaria con ese nombre');
        (error as any).statusCode = 400;
        throw error;
    }

    const newInmobiliaria = await prisma.inmobiliaria.create({
        data: {
            nombre: data.nombre,
            razonSocial: data.razonSocial,
            // Asignar undefined a los campos opcionales si no se proporcionan
            contacto: data.contacto ?? undefined,
            comxventa: data.comxventa != null ? new Prisma.Decimal(data.comxventa) : undefined,
            // Relacionando por FK directa 
            user:   data.userId  != null ? { connect: { id: data.userId  } } : undefined,
            createdAt: new Date(),
            updateAt: undefined,
        }
    });
    return newInmobiliaria
}
// ==============================
// Actualizar Inmobiliaria existente
// ==============================
// Busca la Inmobiliaria por ID y, si existe, reemplaza sus datos con los nuevos recibidos.
// Devuelve mensaje segun resultado.
export async function updateInmobiliaria(id: number, updateData: PutInmobiliariaRequest): Promise<PutInmobiliariaResponse> {
    const inmobiliaria = await prisma.inmobiliaria.findFirst({
    where: { nombre: updateData.nombre }});
    if (inmobiliaria) {
        const error = new Error('Advertencia: Ya existe una inmobiliaria con ese nombre');
        (error as any).statusCode = 400;
        throw error;
    }
    try{
        const updatedInmobiliaria = await prisma.inmobiliaria.update({
        where: { id },
        data: {
            ...(updateData.nombre !== undefined ? { nombre: updateData.nombre } : {}),
            ...(updateData.contacto !== undefined ? { contacto: updateData.contacto } : {}),
            updateAt: new Date(), // Actualizar la fecha de modificación
        },
        });
        return ({message:"Inmobiliaria actualizada exitosamente"});
    } catch (e: any) {
        if (e.code === 'P2025') { // Código de error de Prisma para "registro no encontrado"
            const error = new Error('Inmobiliaria no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e; // Re-lanzar otros errores
    }
}
// ==============================
// Eliminar Inmobiliaria
// ==============================
// Elimina de la BD la Inmobiliaria que coincida con el ID especificado.
// Devuelve mensaje segun exito o error.
export async function deleteInmobiliaria(id: number): Promise<DeleteInmobiliariaResponse> {
    try {
        await prisma.inmobiliaria.delete({
            where: { id },
        });
        return { message: 'Inmobiliaria eliminada correctamente' };
    } catch (e: any) {
        if (e.code === 'P2025') { // Código de error de Prisma para "registro no encontrado"
            const error = new Error('Inmobiliaria no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e; // Re-lanzar otros errores
    }
}