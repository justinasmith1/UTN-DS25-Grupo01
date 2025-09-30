import prisma from '../config/prisma';
import type { Persona as PrismaPersona } from "../generated/prisma";
import type { Identificador, Persona, DeletePersonaResponse,  DeletePersonaRequest, GetPersonaRequest, GetPersonasResponse, PutPersonaResponse,  PostPersonaRequest,  PostPersonaResponse, } from '../types/interfacesCCLF';


    // DTOs
    export interface CreatePersonaDto {
    nombre: string;
    apellido: string;
    identificador: string; // En el DTO, el identificador es un string que contendrá tipo:valor
    telefono?: number;
    email?: string;
    }

    export interface UpdatePersonaDto {
    nombre?: string;
    apellido?: string;
    identificador?: string; // En el DTO, el identificador es un string que contendrá tipo:valor
    telefono?: number;
    email?: string;
    }

    // mapeo de PrismaPersona a Persona
    const toPersona = (p: PrismaPersona, telefonoOverride?: number, emailOverride?: string): Persona => {
    const contacto = p.contacto;
    const email = emailOverride || parseEmail(contacto);
    const telefono = telefonoOverride || parseTelefono(contacto);

    return {
        idPersona: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        identificador: getTipoIdentificador(p.cuil),
        email: email,
        telefono: telefono
    };
    };

    // Funciones auxiliares
    const formatContacto = (email?: string, telefono?: number): string | undefined => {
    if (email && telefono) {
        return `${email},${telefono}`;
    }
    return email || telefono?.toString();
    };

    const parseEmail = (contacto: string | null): string | undefined => {
    if (!contacto) return undefined;
    const emailMatch = contacto.match(/^[^\s@]+@[^\s@]+\.[^\s@]+/);
    return emailMatch ? emailMatch[0] : undefined;
    };

    const parseTelefono = (contacto: string | null): number | undefined => {
    if (!contacto) return undefined;
    const phoneMatch = contacto.match(/\d+/g);
    if (phoneMatch) {
        return parseInt(phoneMatch.join(''));
    }
    return undefined;
    };

    const getTipoIdentificador = (valor: string): Identificador => {
    if (/^\d{8}$/.test(valor)) {
        return 'DNI';
    } else if (/^\d{2}-?\d{8}-?\d{1}$/.test(valor)) {
        return valor.startsWith('20') || valor.startsWith('27') || valor.startsWith('30') ? 'CUIT' : 'CUIL';
    } else if (/^[A-Z0-9]{6,9}$/.test(valor)) {
        return 'Pasaporte';
    }
    return 'CUIL'; // Por defecto
    };

    // obtener todas las personas
    export async function getAllPersonas(limit: number = 10): Promise<GetPersonasResponse> {
    const personas = await prisma.persona.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
        user: {
            select: {
            id: true,
            username: true,
            email: true,
            role: true
            }
        }
        }
    });

    return {
        personas: personas.map(p => toPersona(p)),
        total: await prisma.persona.count()
    };
    }

    // obtener persona por ID
    export async function getPersonaById(id: number): Promise<Persona> {
    const persona = await prisma.persona.findUnique({
        where: { id },
        include: {
        user: {
            select: {
            id: true,
            username: true,
            email: true,
            role: true
            }
        }
        }
    });

    if (!persona) {
        const error = new Error('Persona no encontrada');
        (error as any).statusCode = 404;
        throw error;
    }

    return toPersona(persona);
    }

    // crear persona
    export async function createPersona(req: CreatePersonaDto): Promise<Persona> {
    // 1. Extraer tipo y valor del identificador
    const [tipo, valor] = req.identificador.split(':');
    const identificadorValor = valor;

    // 2. Verificar si ya existe una persona con el mismo identificador
    const exists = await prisma.persona.findFirst({ where: { cuil: identificadorValor } });
    if (exists) {
        const error = new Error('Ya existe una persona con este identificador') as any;
        error.statusCode = 409;
        throw error;
    }

    // 3. Crear persona
    const created = await prisma.persona.create({
        data: {
        nombre: req.nombre.trim(),
        apellido: req.apellido.trim(),
        cuil: identificadorValor,
        contacto: formatContacto(req.email, req.telefono),
        updateAt: new Date()
        },
        include: {
        user: {
            select: {
            id: true,
            username: true,
            email: true,
            role: true
            }
        }
        }
    });

    return toPersona(created, req.telefono, req.email);
    }

    // actualizar persona
    export async function updatePersona(idActual: number, req: UpdatePersonaDto): Promise<PutPersonaResponse> {
    try {
        const existingPersona = await prisma.persona.findUnique({
        where: { id: idActual }
        });

        if (!existingPersona) {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
        }

        const updateData: any = {
        updateAt: new Date()
        };

        if (req.nombre) updateData.nombre = req.nombre.trim();
        if (req.apellido) updateData.apellido = req.apellido.trim();

        if (req.identificador) {
        const [tipo, valor] = req.identificador.split(':');
        const nuevoIdentificador = valor;
        
        if (nuevoIdentificador !== existingPersona.cuil) {
            // Verificar que no exista otra persona con el mismo identificador
            const duplicate = await prisma.persona.findFirst({
            where: { cuil: nuevoIdentificador }
            });
            if (duplicate) {
            const error = new Error('Ya existe una persona con este identificador') as any;
            error.statusCode = 409;
            throw error;
            }
            updateData.cuil = nuevoIdentificador;
        }
        }

        if (req.email !== undefined || req.telefono !== undefined) {
        updateData.contacto = formatContacto(
            req.email !== undefined ? req.email : parseEmail(existingPersona.contacto),
            req.telefono !== undefined ? req.telefono : parseTelefono(existingPersona.contacto)
        );
        }

        const updated = await prisma.persona.update({
        where: { id: idActual },
        data: updateData,
        include: {
            user: {
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
            }
        }
        });

        return {
        persona: toPersona(updated, req.telefono, req.email),
        message: "La persona se actualizó con éxito"
        };
    } catch (e: any) {
        if (e.code === 'P2025') {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
        }
        throw e;
    }
    }

    // eliminar persona
    export async function deletePersona(id: number): Promise<DeletePersonaResponse> {
    try {
        const existingPersona = await prisma.persona.findUnique({
        where: { id }
        });

        if (!existingPersona) {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
        }

        // Verificar si la persona tiene relaciones que impidan la eliminación
        const lotes = await prisma.lote.count({
        where: { propietarioId: id }
        });

        const ventas = await prisma.venta.count({
        where: { compradorId: id }
        });

        const reservas = await prisma.reserva.count({
        where: { clienteId: id }
        });

        if (lotes > 0 || ventas > 0 || reservas > 0) {
        const error = new Error('No se puede eliminar la persona porque tiene relaciones activas') as any;
        error.statusCode = 400;
        throw error;
        }

        await prisma.persona.delete({ where: { id } });
        return { message: 'Persona eliminada con éxito' };
    } catch (e: any) {
        if (e.code === 'P2025') {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
        }
        throw e;
    }
    }

    // buscar persona por CUIL
    export async function getPersonaByCuil(cuil: string): Promise<Persona | null> {
    const persona = await prisma.persona.findFirst({
        where: { cuil },
        include: {
        user: {
            select: {
            id: true,
            username: true,
            email: true,
            role: true
            }
        }
        }
    });

    if (!persona) return null;

    return toPersona(persona);
    }

    // Clase de servicio para mantener compatibilidad
    export class PersonaService {
    async create( data: CreatePersonaDto) {
        return createPersona(data);
    }

    async findAll() {
        const result = await getAllPersonas();
        return result;
    }

    async findById(id: number) {
        return getPersonaById(id);
    }

    async update(id: number, data: UpdatePersonaDto) {
        return updatePersona(id, data);
    }

    async delete(id: number) {
        return deletePersona(id);
    }

    async findByCuil(cuil: string) {
        return getPersonaByCuil(cuil);
    }
    }