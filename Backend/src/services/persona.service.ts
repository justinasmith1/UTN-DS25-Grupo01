import prisma from '../config/prisma';
import type { Persona as PrismaPersona, IdentificadorTipo, EstadoPersona } from "../generated/prisma";
import type { Identificador, Persona, DeletePersonaResponse, GetPersonaRequest, GetPersonasResponse, PutPersonaResponse, PostPersonaRequest, PostPersonaResponse } from '../types/interfacesCCLF';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Tipos para views
export type PersonaView = 'ALL' | 'PROPIETARIOS' | 'INQUILINOS' | 'CLIENTES' | 'MIS_CLIENTES';

// DTOs
export interface CreatePersonaDto {
  identificadorTipo: IdentificadorTipo;
  identificadorValor: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  telefono?: number;
  email?: string;
  jefeDeFamiliaId?: number;
  inmobiliariaId?: number | null; // Opcional, solo para ADMIN/GESTOR
}

export interface UpdatePersonaDto {
  identificadorTipo?: IdentificadorTipo;
  identificadorValor?: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  telefono?: number;
  email?: string;
  jefeDeFamiliaId?: number;
  estado?: EstadoPersona;
  inmobiliariaId?: number | null;
}

// Tipo local para incluir relaciones y conteos
type PersonaWithRelations = PrismaPersona & {
  _count?: { lotesPropios?: number; lotesAlquilados?: number; Reserva?: number; Venta?: number };
  jefeDeFamilia?: Pick<PrismaPersona, 'id' | 'nombre' | 'apellido' | 'identificadorValor'> | null;
  miembrosFamilia?: Array<Pick<PrismaPersona, 'id' | 'nombre' | 'apellido' | 'identificadorValor'>>;
  inmobiliaria?: { id: number; nombre: string } | null;
  lotesPropios?: Array<{ id: number; numero: number | null; fraccion: { numero: number } }>;
  lotesAlquilados?: Array<{ id: number; numero: number | null; fraccion: { numero: number }; estado: string }>;
  Reserva?: Array<{ id: number; numero: string; createdAt: Date; loteId: number }>;
  Venta?: Array<{ id: number; numero: string }>;
};

// Helper para formatear contacto
const formatContacto = (email?: string, telefono?: number): string | undefined => {
  if (email && telefono) {
    return `${email},${telefono}`;
  }
  return email || telefono?.toString();
};

// Helper para parsear contacto
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

// Helper para normalizar identificadorValor (garantiza consistencia antes de persistir)
function normalizeIdentificador(tipo: IdentificadorTipo, valor: string): string {
  let normalized = valor.trim();
  
  // Para CUIL/CUIT, eliminar guiones, espacios y puntos
  if (tipo === 'CUIL' || tipo === 'CUIT') {
    normalized = normalized.replace(/[-.\s]/g, '');
  }
  
  // Para otros tipos, solo trim
  return normalized;
}

// Helper para mapear IdentificadorTipo a Identificador (DTO)
const getTipoIdentificador = (tipo: IdentificadorTipo): Identificador => {
  switch (tipo) {
    case 'DNI':
      return 'DNI';
    case 'CUIL':
      return 'CUIL';
    case 'CUIT':
      return 'CUIT';
    case 'PASAPORTE':
      return 'Pasaporte';
    case 'OTRO':
      return 'CUIL'; // Por defecto para compatibilidad
    default:
      return 'CUIL';
  }
};

// Mapeo de PrismaPersona a Persona (DTO)
// Nota: El tipo de retorno incluye campos adicionales para mini detalles
const toPersona = (p: PersonaWithRelations, telefonoOverride?: number, emailOverride?: string): Persona => {
  const contacto = p.contacto;
  // Usar email del campo propio primero, luego override, luego parsear de contacto
  const email = emailOverride || p.email || parseEmail(contacto);
  const telefono = telefonoOverride || parseTelefono(contacto);

  const esPropietario = (p._count?.lotesPropios ?? 0) > 0;
  const esInquilino = (p._count?.lotesAlquilados ?? 0) > 0;

  const jefeDeFamilia = p.jefeDeFamilia
    ? {
        idPersona: p.jefeDeFamilia.id,
        nombre: p.jefeDeFamilia.nombre || '',
        apellido: p.jefeDeFamilia.apellido || '',
        cuil: p.jefeDeFamilia.identificadorValor || '',
      }
    : null;

  const miembrosFamilia = (p.miembrosFamilia ?? []).map((m) => ({
    idPersona: m.id,
    nombre: m.nombre || '',
    apellido: m.apellido || '',
    cuil: m.identificadorValor || '',
  }));

  const esJefeDeFamilia = (p.miembrosFamilia?.length ?? 0) > 0;

  return {
    idPersona: p.id,
    nombre: p.nombre || '',
    apellido: p.apellido || '',
    razonSocial: p.razonSocial || '',
    identificador: getTipoIdentificador(p.identificadorTipo),
    identificadorTipo: p.identificadorTipo,
    identificadorValor: p.identificadorValor || '',
    email: email,
    telefono: telefono,
    contacto: p.contacto || '',
    estado: p.estado || 'ACTIVA',
    inmobiliariaId: p.inmobiliariaId || null,
    inmobiliaria: p.inmobiliaria || null,
    esPropietario,
    esInquilino,
    jefeDeFamilia,
    miembrosFamilia,
    esJefeDeFamilia,
    _count: p._count ? {
      lotesPropios: p._count.lotesPropios ?? 0,
      lotesAlquilados: p._count.lotesAlquilados ?? 0,
      Reserva: p._count.Reserva ?? 0,
      Venta: p._count.Venta ?? 0,
    } : { lotesPropios: 0, lotesAlquilados: 0, Reserva: 0, Venta: 0 },
    // Arrays mínimos para mini detalles (campos adicionales al tipo Persona)
    lotesPropios: (p.lotesPropios || []).map(l => ({
      id: l.id,
      numero: l.numero,
      fraccionNumero: l.fraccion?.numero,
    })),
    lotesAlquilados: (p.lotesAlquilados || []).map(l => ({
      id: l.id,
      numero: l.numero,
      fraccionNumero: l.fraccion?.numero,
      estado: l.estado,
    })),
    reservas: (p.Reserva || []).map(r => ({
      id: r.id,
      numero: r.numero,
      createdAt: r.createdAt,
      loteId: r.loteId,
    })),
    ventas: (p.Venta || []).map(v => ({
      id: v.id,
      numero: v.numero,
    })),
  } as Persona & { lotesPropios?: any[]; lotesAlquilados?: any[]; reservas?: any[]; ventas?: any[] };
};

// Construir where clause según view
function buildWhereClause(
  view: PersonaView,
  user?: { role: string; inmobiliariaId?: number | null },
  q?: string,
  includeInactive?: boolean,
  estado?: 'ACTIVA' | 'INACTIVA'
) {
  const where: any = {};

  // Filtro de estado (simple, igual que inmobiliarias)
  if (estado) {
    where.estado = estado;
  } else if (!includeInactive) {
    // Por defecto, solo activas si no se especifica estado
    where.estado = 'ACTIVA';
  }

  // Filtro por view
  switch (view) {
    case 'PROPIETARIOS':
      where.lotesPropios = { some: {} };
      break;

    case 'INQUILINOS':
      where.lotesAlquilados = {
        some: {
          estado: 'ALQUILADO',
        },
      };
      break;

    case 'CLIENTES':
      where.lotesPropios = { none: {} };
      where.lotesAlquilados = {
        none: {
          estado: 'ALQUILADO',
        },
      };
      break;

    case 'MIS_CLIENTES':
      // CLIENTES + filtro por inmobiliariaId
      where.lotesPropios = { none: {} };
      where.lotesAlquilados = {
        none: {
          estado: 'ALQUILADO',
        },
      };
      if (user?.inmobiliariaId) {
        where.inmobiliariaId = user.inmobiliariaId;
      } else {
        // Si no tiene inmobiliariaId, no devolver nada
        where.id = -1; // Imposible
      }
      break;

    case 'ALL':
    default:
      // Sin filtro adicional de view
      break;
  }

  // Buscador q
  if (q && q.trim()) {
    const searchTerm = q.trim();
    where.OR = [
      { nombre: { contains: searchTerm, mode: 'insensitive' } },
      { apellido: { contains: searchTerm, mode: 'insensitive' } },
      { razonSocial: { contains: searchTerm, mode: 'insensitive' } },
      { identificadorValor: { contains: searchTerm, mode: 'insensitive' } },
      { contacto: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  return where;
}

// ------------------------------------------------------
// Aca comienza el crud
// ------------------------------------------------------

// Obtener todas las personas con filtros
export async function getAllPersonas(
  user?: { role: string; inmobiliariaId?: number | null },
  query?: {
    view?: PersonaView;
    q?: string;
    includeInactive?: boolean;
    estado?: 'ACTIVA' | 'INACTIVA';
    limit?: number;
  }
): Promise<GetPersonasResponse> {
  const view = query?.view || 'ALL';
  const q = query?.q;
  const includeInactive = query?.includeInactive === true;
  const estado = query?.estado;
  const limit = query?.limit || 100;

  // RBAC: INMOBILIARIA solo puede ver MIS_CLIENTES (forzar view, ignorar query)
  if (user?.role === 'INMOBILIARIA') {
    // Validar que tenga inmobiliariaId
    if (!user.inmobiliariaId) {
      const error = new Error('INMOBILIARIA debe tener inmobiliariaId asociado') as any;
      error.statusCode = 403;
      throw error;
    }
    // Forzar view = MIS_CLIENTES (ignorar lo que venga en query)
    const effectiveView = 'MIS_CLIENTES';
    // includeInactive solo para ADMIN/GESTOR
    const effectiveIncludeInactive = false;
    // INMOBILIARIA no puede filtrar por estado específico, solo ve activas
    const where = buildWhereClause(effectiveView, user, q, effectiveIncludeInactive);

    const personas = await prisma.persona.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        _count: { select: { lotesPropios: true, lotesAlquilados: true, Reserva: true, Venta: true } },
        jefeDeFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
        miembrosFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
        inmobiliaria: { select: { id: true, nombre: true } },
      },
    });

    return {
      personas: personas.map((p) => toPersona(p as PersonaWithRelations)),
      total: await prisma.persona.count({ where }),
    };
  }

  // ADMINISTRADOR/GESTOR/TECNICO pueden ver todas las views
  // includeInactive solo para ADMIN/GESTOR
  const effectiveIncludeInactive = (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR') 
    ? includeInactive 
    : false;
  // Solo ADMIN/GESTOR pueden filtrar por estado específico
  const effectiveEstado = (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR') 
    ? estado 
    : undefined;
  const where = buildWhereClause(view, user, q, effectiveIncludeInactive, effectiveEstado);

  const personas = await prisma.persona.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, username: true, email: true, role: true } },
      _count: { select: { lotesPropios: true, lotesAlquilados: true, Reserva: true, Venta: true } },
      jefeDeFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
      miembrosFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
      inmobiliaria: { select: { id: true, nombre: true } },
    },
  });

  return {
    personas: personas.map((p) => toPersona(p as PersonaWithRelations)),
    total: await prisma.persona.count({ where }),
  };
}

// Obtener persona por ID
export async function getPersonaById(
  id: number,
  user?: { role: string }
): Promise<Persona> {
  const persona = await prisma.persona.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, role: true } },
      _count: { select: { lotesPropios: true, lotesAlquilados: true, Reserva: true, Venta: true } },
      jefeDeFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
      miembrosFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
      inmobiliaria: { select: { id: true, nombre: true } },
      // Arrays mínimos para mini detalles
      lotesPropios: {
        select: { id: true, numero: true, mapId: true, fraccion: { select: { numero: true } } },
        take: 10, // Límite razonable para el mini detalle
      },
      lotesAlquilados: {
        select: { id: true, numero: true, mapId: true, estado: true, fraccion: { select: { numero: true } } },
        where: { estado: 'ALQUILADO' }, // Solo inquilinos vigentes
        take: 10,
      },
      Reserva: {
        select: { id: true, numero: true, createdAt: true, loteId: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      Venta: {
        select: { id: true, numero: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!persona) {
    const error = new Error('Persona no encontrada');
    (error as any).statusCode = 404;
    throw error;
  }

  // Soft delete: solo ADMIN/GESTOR pueden ver personas INACTIVAS
  if (persona.estado === 'INACTIVA') {
    if (user?.role !== 'ADMINISTRADOR' && user?.role !== 'GESTOR') {
      const error = new Error('Persona no encontrada') as any;
      error.statusCode = 404; // 404 para no revelar existencia
      throw error;
    }
  }

  return toPersona(persona as PersonaWithRelations);
}

// Crear persona
export async function createPersona(
  req: CreatePersonaDto,
  user?: { role: string; inmobiliariaId?: number | null }
): Promise<Persona> {
  
  // Normalizar identificadorValor antes de verificar existencia
  const identificadorValorNormalized = normalizeIdentificador(req.identificadorTipo, req.identificadorValor);
  
  // Verificar si ya existe una persona con el mismo identificador
  const exists = await prisma.persona.findUnique({
    where: {
      identificadorTipo_identificadorValor: {
        identificadorTipo: req.identificadorTipo,
        identificadorValor: identificadorValorNormalized,
      },
    },
  });

  if (exists) {
    const error = new Error('Ya existe una persona con ese identificador') as any;
    error.statusCode = 409;
    throw error;
  }

  // RBAC: Forzar "Cliente de" según rol
  let finalInmobiliariaId: number | null | undefined = undefined;
  
  if (user?.role === 'INMOBILIARIA') {
    // INMOBILIARIA: ignorar cualquier inmobiliariaId del body, usar solo la del usuario
    if (!user.inmobiliariaId) {
      const error = new Error('INMOBILIARIA debe tener inmobiliariaId asociado') as any;
      error.statusCode = 403;
      throw error;
    }
    finalInmobiliariaId = user.inmobiliariaId;
  } else if (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR') {
    // ADMIN/GESTOR: usar exactamente lo que viene del body
    if (req.inmobiliariaId !== undefined) {
      // Si es un número, validar que la inmobiliaria exista
      if (req.inmobiliariaId !== null) {
        const inmobiliariaExists = await prisma.inmobiliaria.findUnique({
          where: { id: req.inmobiliariaId },
        });
        if (!inmobiliariaExists) {
          const error = new Error('La inmobiliaria especificada no existe') as any;
          error.statusCode = 400;
          throw error;
        }
      }
      finalInmobiliariaId = req.inmobiliariaId;
    }
  }

  // Construir data (usar valor normalizado)
  const createData: any = {
    identificadorTipo: req.identificadorTipo,
    identificadorValor: identificadorValorNormalized,
    nombre: req.nombre?.trim(),
    apellido: req.apellido?.trim(),
    razonSocial: req.razonSocial?.trim(),
    contacto: formatContacto(req.email, req.telefono),
    updateAt: new Date(),
    estado: 'ACTIVA',
  };

  // Incluir inmobiliariaId solo si está definido (puede ser null para "La Federala")
  if (finalInmobiliariaId !== undefined) {
    createData.inmobiliariaId = finalInmobiliariaId;
  }

  // Normalizar jefe de familia
  const jefeIdNormalized =
    req.jefeDeFamiliaId !== undefined &&
    req.jefeDeFamiliaId !== null &&
    !Number.isNaN(Number(req.jefeDeFamiliaId))
      ? Number(req.jefeDeFamiliaId)
      : undefined;

  let created;
  try {
    created = await prisma.persona.create({ data: createData });

    // Si vino jefeDeFamiliaId, vincularlo
    if (jefeIdNormalized !== undefined) {
      await prisma.persona.update({
        where: { id: created.id },
        data: { jefeDeFamilia: { connect: { id: jefeIdNormalized } } },
      });
    }
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        const error = new Error('Ya existe una persona con ese identificador') as any;
        error.statusCode = 409;
        throw error;
      }
    }
    throw e;
  }

  // Releer con includes
  const full = await prisma.persona.findUnique({
    where: { id: created.id },
    include: {
      user: { select: { id: true, username: true, email: true, role: true } },
      _count: { select: { lotesPropios: true, lotesAlquilados: true } },
      jefeDeFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
      miembrosFamilia: { select: { id: true, nombre: true, apellido: true, identificadorValor: true } },
      inmobiliaria: { select: { id: true, nombre: true } },
    },
  });

  return toPersona(full as PersonaWithRelations, req.telefono, req.email);
}

// Actualizar persona
export async function updatePersona(idActual: number, req: UpdatePersonaDto): Promise<PutPersonaResponse> {
  try {
    const existingPersona = await prisma.persona.findUnique({
      where: { id: idActual },
    });

    if (!existingPersona) {
      const error = new Error('Persona no encontrada') as any;
      error.statusCode = 404;
      throw error;
    }

    const updateData: any = {
      updateAt: new Date(),
    };

    if (req.nombre !== undefined) updateData.nombre = req.nombre.trim();
    if (req.apellido !== undefined) updateData.apellido = req.apellido.trim();
    if (req.razonSocial !== undefined) updateData.razonSocial = req.razonSocial.trim();

    // Si viene identificador, normalizar y validar unicidad
    if (req.identificadorTipo && req.identificadorValor) {
      const identificadorValorNormalized = normalizeIdentificador(req.identificadorTipo, req.identificadorValor);
      const nuevoIdentificador = {
        identificadorTipo: req.identificadorTipo,
        identificadorValor: identificadorValorNormalized,
      };

      // Verificar si cambió el identificador
      if (
        existingPersona.identificadorTipo !== nuevoIdentificador.identificadorTipo ||
        existingPersona.identificadorValor !== nuevoIdentificador.identificadorValor
      ) {
        // Verificar que no exista otra persona con el mismo identificador
        const duplicate = await prisma.persona.findUnique({
          where: {
            identificadorTipo_identificadorValor: nuevoIdentificador,
          },
        });

        if (duplicate && duplicate.id !== idActual) {
          const error = new Error('Ya existe una persona con ese identificador') as any;
          error.statusCode = 409;
          throw error;
        }

        updateData.identificadorTipo = nuevoIdentificador.identificadorTipo;
        updateData.identificadorValor = nuevoIdentificador.identificadorValor;
      }
    }

    // Actualizar email si viene
    if (req.email !== undefined) {
      updateData.email = req.email?.trim() || null;
    }
    
    // Actualizar contacto si viene telefono o email
    if (req.email !== undefined || req.telefono !== undefined) {
      updateData.contacto = formatContacto(
        req.email !== undefined ? req.email : (existingPersona.email || parseEmail(existingPersona.contacto)),
        req.telefono !== undefined ? req.telefono : parseTelefono(existingPersona.contacto)
      );
    }

    // Estado solo para ADMIN/GESTOR (validar en controller si es necesario)
    if (req.estado !== undefined) {
      updateData.estado = req.estado;
    }

    // inmobiliariaId solo para ADMIN/GESTOR (validar en controller si es necesario)
    if (req.inmobiliariaId !== undefined) {
      updateData.inmobiliariaId = req.inmobiliariaId;
    }

    // Lógica de fechaBaja automática (igual que inmobiliarias)
    let fechaBajaCalc: Date | null | undefined = undefined;
    if (req.estado === 'INACTIVA') {
      fechaBajaCalc = new Date();
    } else if (req.estado === 'ACTIVA') {
      fechaBajaCalc = null;
    }

    const updated = await prisma.persona.update({
      where: { id: idActual },
      data: {
        ...updateData,
        ...(fechaBajaCalc !== undefined ? { fechaBaja: fechaBajaCalc } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
        inmobiliaria: { select: { id: true, nombre: true } },
      },
    });

    return {
      persona: toPersona(updated, req.telefono, req.email),
      message: 'La persona se actualizó con éxito',
    };
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
      }
      if (e.code === 'P2002') {
        const error = new Error('Ya existe una persona con ese identificador') as any;
        error.statusCode = 409;
        throw error;
      }
    }
    throw e;
  }
}

// Desactivar persona (soft delete)
export async function desactivarPersona(id: number): Promise<DeletePersonaResponse> {
  try {
    const existingPersona = await prisma.persona.findUnique({
      where: { id },
    });

    if (!existingPersona) {
      const error = new Error('Persona no encontrada') as any;
      error.statusCode = 404;
      throw error;
    }

    if (existingPersona.estado === 'INACTIVA') {
      const error = new Error('La persona ya está inactiva') as any;
      error.statusCode = 400;
      throw error;
    }

    await prisma.persona.update({
      where: { id },
      data: {
        estado: 'INACTIVA',
        fechaBaja: new Date(),
        updateAt: new Date(),
      },
    });

    return { message: 'Persona desactivada con éxito' };
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
      }
    }
    throw e;
  }
}

// Reactivar persona
export async function reactivarPersona(id: number): Promise<PutPersonaResponse> {
  try {
    const existingPersona = await prisma.persona.findUnique({
      where: { id },
    });

    if (!existingPersona) {
      const error = new Error('Persona no encontrada') as any;
      error.statusCode = 404;
      throw error;
    }

    if (existingPersona.estado === 'ACTIVA') {
      const error = new Error('La persona ya está activa') as any;
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.persona.update({
      where: { id },
      data: {
        estado: 'ACTIVA',
        fechaBaja: null,
        updateAt: new Date(),
      },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        inmobiliaria: { select: { id: true, nombre: true } },
      },
    });

    return {
      persona: toPersona(updated as PersonaWithRelations),
      message: 'Persona reactivada con éxito',
    };
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
      }
    }
    throw e;
  }
}

// Eliminar persona definitivamente (hard delete) - solo si no tiene asociaciones
export async function deletePersonaDefinitivo(id: number): Promise<DeletePersonaResponse> {
  try {
    const existingPersona = await prisma.persona.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lotesPropios: true,
            lotesAlquilados: true,
            Reserva: true,
            Venta: true,
          },
        },
      },
    });

    if (!existingPersona) {
      const error = new Error('Persona no encontrada') as any;
      error.statusCode = 404;
      throw error;
    }

    // Validar que no tenga asociaciones
    const counts = existingPersona._count || {};
    const tieneAsociaciones = 
      (counts.lotesPropios || 0) > 0 ||
      (counts.lotesAlquilados || 0) > 0 ||
      (counts.Reserva || 0) > 0 ||
      (counts.Venta || 0) > 0;

    if (tieneAsociaciones) {
      const error = new Error(
        'No se puede eliminar definitivamente porque tiene asociaciones (lotes, reservas o ventas)'
      ) as any;
      error.statusCode = 409;
      throw error;
    }

    await prisma.persona.delete({
      where: { id },
    });

    return { message: 'Persona eliminada definitivamente' };
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        const error = new Error('Persona no encontrada') as any;
        error.statusCode = 404;
        throw error;
      }
    }
    throw e;
  }
}

// Mantener deletePersona por compatibilidad (ahora llama a desactivar)
export async function deletePersona(id: number): Promise<DeletePersonaResponse> {
  return desactivarPersona(id);
}

// Buscar persona por identificador (nuevo método)
export async function getPersonaByIdentificador(
  tipo: IdentificadorTipo,
  valor: string
): Promise<Persona | null> {
  const valorNormalized = normalizeIdentificador(tipo, valor);
  
  const persona = await prisma.persona.findUnique({
    where: {
      identificadorTipo_identificadorValor: {
        identificadorTipo: tipo,
        identificadorValor: valorNormalized,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      },
      inmobiliaria: { select: { id: true, nombre: true } },
    },
  });

  if (!persona) return null;

  return toPersona(persona);
}

// Buscar persona por CUIL (legacy endpoint - compatibilidad)
export async function getPersonaByCuil(cuil: string): Promise<Persona | null> {
  // Normalizar CUIL (quitar guiones, espacios, puntos)
  const cuilNormalized = cuil.trim().replace(/[-.\s]/g, '');
  
  // 1. Buscar primero por identificadorTipo=CUIL con valor normalizado
  let persona = await prisma.persona.findUnique({
    where: {
      identificadorTipo_identificadorValor: {
        identificadorTipo: 'CUIL',
        identificadorValor: cuilNormalized,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      },
      inmobiliaria: { select: { id: true, nombre: true } },
    },
  });

  // 2. Si no se encuentra, fallback al campo legacy cuil
  if (!persona) {
    persona = await prisma.persona.findFirst({
      where: {
        cuil: cuilNormalized,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
        inmobiliaria: { select: { id: true, nombre: true } },
      },
    });
  }

  if (!persona) return null;

  return toPersona(persona);
}

// Asignar referencias a las funciones después de que estén definidas (antes de la clase)
const desactivarPersonaFn = desactivarPersona;
const reactivarPersonaFn = reactivarPersona;
const deletePersonaDefinitivoFn = deletePersonaDefinitivo;

// Clase de servicio para mantener compatibilidad
export class PersonaService {
  async create(data: CreatePersonaDto, user?: { role: string; inmobiliariaId?: number | null }) {
    return createPersona(data, user);
  }

  async findAll(
    user?: { role: string; inmobiliariaId?: number | null },
    query?: { view?: PersonaView; q?: string; includeInactive?: boolean; estado?: 'ACTIVA' | 'INACTIVA'; limit?: number }
  ) {
    const result = await getAllPersonas(user, query);
    return result;
  }

  async findById(id: number, user?: { role: string }) {
    return getPersonaById(id, user);
  }

  async update(id: number, data: UpdatePersonaDto) {
    return updatePersona(id, data);
  }

  async delete(id: number) {
    return deletePersona(id);
  }

  async findByIdentificador(tipo: IdentificadorTipo, valor: string) {
    return getPersonaByIdentificador(tipo, valor);
  }

  async findByCuil(cuil: string) {
    return getPersonaByCuil(cuil);
  }

  async desactivarPersona(id: number) {
    return desactivarPersonaFn(id);
  }

  async reactivarPersona(id: number) {
    return reactivarPersonaFn(id);
  }

  async deletePersonaDefinitivo(id: number) {
    return deletePersonaDefinitivoFn(id);
  }
}
