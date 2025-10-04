import prisma from '../config/prisma';
import type { Ubicacion as DtoUbicacion, GetUbicacionesResponse, DeleteUbicacionResponse, Calle } from '../types/interfacesCCLF';
import type { NombreCalle as PrismaNombreCalle } from '../generated/prisma';

// Map DTO Calle -> Prisma enum
const calleToPrisma = (c: string): PrismaNombreCalle => {
  const map: Record<string, PrismaNombreCalle> = {
    Reinamora: 'REINAMORA',
    Maca: 'MACA',
    Zorzal: 'ZORZAL',
    'Cauquén': 'CAUQUEN',
    Cauquen: 'CAUQUEN',
    Alondra: 'ALONDRA',
    Jacana: 'JACANA',
    Tacuarito: 'TACUARITO',
    Jilguero: 'JILGUERO',
    Golondrina: 'GOLONDRINA',
    Calandria: 'CALANDRIA',
    Aguilamora: 'AGUILAMORA',
    Lorca: 'LORCA',
    Milano: 'MILANO',
  } as const;
  const v = map[c as keyof typeof map];
  if (!v) throw Object.assign(new Error(`Calle inválida: ${c}`), { statusCode: 400 });
  return v;
};

// Map Prisma -> DTO
const toUbicacion = (u: any): DtoUbicacion => ({
  id: u.id,
  calle: normalizeDtoCalle(u.calle),
  numero: u.numero,
});

const normalizeDtoCalle = (p: PrismaNombreCalle): Calle => {
  switch (p) {
    case 'REINAMORA': return 'Reinamora';
    case 'MACA': return 'Maca';
    case 'ZORZAL': return 'Zorzal';
    case 'CAUQUEN': return 'Cauquén';
    case 'ALONDRA': return 'Alondra';
    case 'JACANA': return 'Jacana';
    case 'TACUARITO': return 'Tacuarito';
    case 'JILGUERO': return 'Jilguero';
    case 'GOLONDRINA': return 'Golondrina';
    case 'CALANDRIA': return 'Calandria';
    case 'AGUILAMORA': return 'Aguilamora';
    case 'LORCA': return 'Lorca';
    case 'MILANO': return 'Milano';
    default: throw new Error(`Calle Prisma inválida: ${p}`);
  }
};

// Obtener todas las ubicaciones con total
export async function getAllUbicaciones(limit: number = 10): Promise<GetUbicacionesResponse> {
  const [ubicaciones, total] = await Promise.all([
    prisma.ubicacion.findMany({
      orderBy: { id: 'asc' },
      take: limit,
    }),
    prisma.ubicacion.count(),
  ]);
  return {
    ubicaciones: ubicaciones.map(toUbicacion),
    total,
  };
}

// Obtener por ID
export async function getUbicacionById(id: number): Promise<DtoUbicacion> {
  const u = await prisma.ubicacion.findUnique({ where: { id } });
  if (!u) {
    const e: any = new Error('Ubicación no encontrada');
    e.statusCode = 404;
    throw e;
  }
  return toUbicacion(u);
}

// Crear
export async function createUbicacion(data: { calle: string; numero: number }): Promise<DtoUbicacion> {
  const created = await prisma.ubicacion.create({
    data: {
      calle: calleToPrisma(data.calle),
      numero: data.numero,
    },
  });
  return toUbicacion(created);
}

// Actualizar
export async function updateUbicacion(id: number, data: { calle?: string; numero?: number }): Promise<DtoUbicacion> {
  try {
    const payload: any = {};
    if (data.calle !== undefined) payload.calle = calleToPrisma(data.calle);
    if (data.numero !== undefined) payload.numero = data.numero;

    const updated = await prisma.ubicacion.update({ where: { id }, data: payload });
    return toUbicacion(updated);
  } catch (e: any) {
    if (e.code === 'P2025') {
      const err: any = new Error('Ubicación no encontrada');
      err.statusCode = 404;
      throw err;
    }
    throw e;
  }
}

// Eliminar
export async function deleteUbicacion(id: number): Promise<DeleteUbicacionResponse> {
  try {
    await prisma.ubicacion.delete({ where: { id } });
    return { message: 'Ubicación eliminada correctamente' };
  } catch (e: any) {
    if (e.code === 'P2025') {
      const err: any = new Error('Ubicación no encontrada');
      err.statusCode = 404;
      throw err;
    }
    throw e;
  }
}
