import{
    GetInmobiliariasResponse,
    GetInmobiliariaRequest,
    GetInmobiliariaResponse,
    PutInmobiliariaRequest,
    PutInmobiliariaResponse,
    PostInmobiliariaRequest,
    PostInmobiliariaResponse,
    DeleteInmobiliariaRequest,
    DeleteInmobiliariaResponse
} from '../types/interfacesCCLF';
import { Inmobiliaria } from '../generated/prisma';
import prisma from '../config/prisma';

//Dejo esto para luego no buscar otra vez los datos reales de las inmobiliarias
let inmobiliarias: Inmobiliaria[] = [
    {
        idInmobiliaria: 1,
        nombre: "Andinolfi Inmobiliaria",
        telefono: "2227-546076",
        email: "camilo@andinolfi.com"
    },
    {
        idInmobiliaria: 2,
        nombre: "NS Inmobiliaria",
        telefono: "+54 9 2227 50-4344",
        email: "contacto@nsInmobiliaria.com.ar"
    },
    {
        idInmobiliaria: 3,
        nombre: "Andrea Gianfelice Inmobiliaria",
        telefono: "(02227) 432429",
        email: "info@agianfeliceprop.com"
    },
    {
        idInmobiliaria: 4,
        nombre: "Azcarate Propiedades",
        telefono: "02227 15555332",
        email: "Azcaratepropiedades.com.ar"
    }
]

// ==============================
// Obtener todas las Inmobiliarias
// ==============================
// Retorna el listado completo de Inmobiliarias junto con el total.
// Esto nos va a ser util para mostrar en listados o paneles administrativos (mostrar el dashboard).
export async function getAllInmobiliarias(): Promise<Inmobiliaria[]> {
    const inmobiliarias = await prisma.inmobiliaria.findMany({
        orderBy: { id: 'asc' }, 
    });
    return inmobiliarias;
}

// ==============================
// Obtener una Inmobiliaria por ID
// ==============================
// Busca dentro de la BSD la Inmobiliaria cuyo ID coincida con el solicitado.
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
            razonSocial: data.razonsocial ?? 'Sin definir',
            // Asignar undefined a los campos opcionales si no se proporcionan
            contacto: data.contacto ?? undefined,
            comxventa: data.comxventa ?? undefined,
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
export async function updateInmobiliaria(id: number, updateData: PutInmobiliariaRequest): Promise<Inmobiliaria> {
    const inmobiliaria = await prisma.inmobiliaria.findFirst({
    where: { nombre: updateData.nombre }});
    if (inmobiliaria) {
        const error = new Error('Ya existe una inmobiliaria con ese nombre');
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
        return updatedInmobiliaria;
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