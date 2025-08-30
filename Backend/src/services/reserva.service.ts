// src/services/reserva.service.ts
import prisma from '../config/prisma'
import type { Reserva as PrismaReserva } from '../generated/prisma'
import type {
  // DTOs y Requests del proyecto
  Reserva as ReservaDTO,
  LoteVenta, Persona, Inmobiliaria,
  GetReservasResponse, GetReservaRequest, GetReservaResponse,
  PostReservaRequest, PostReservaResponse,
  PutReservaRequest, PutReservaResponse,
  DeleteReservaRequest, DeleteReservaResponse
} from '../types/interfacesCCLF'

// Helpers (los puse para que los veamos como una opción a usar para el resto,
// son validación básica y fecha consistente, nada muy raro, sino los saco)
const toDate = (v: string | Date) => {
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) {
    const e = new Error('fechaReserva inválida (usar YYYY-MM-DD)')
    ;(e as any).statusCode = 400
    throw e
  }
  return d
}

// -- Mapeo de PrismaReserva -> Reserva (DTO del proyecto), la hice parecida a la que uso jus asi ya quedan todos con la misma linea
const toReserva = (r: PrismaReserva): ReservaDTO => ({
  idReserva: r.id,
  fechaReserva: r.fechaReserva.toISOString().slice(0, 10),
  seña: r.sena != null ? Number(r.sena) : undefined,
  // hoy devolvemos sólo IDs (como hace usuarios con su DTO); si mañana quieren nombres,
  // se puede agregar include y enriquecer el DTO.
  lote: { idLote: r.loteId } as LoteVenta,
  cliente: { idPersona: r.clienteId } as Persona,
  inmobiliaria: r.inmobiliariaId != null
    ? ({ idInmobiliaria: r.inmobiliariaId } as Inmobiliaria)
    : undefined,
})

// ==============================
// Obtener todas las reservas
// Retorna el listado completo junto con el total.
// ==============================
export async function getAllReservas(p0: any): Promise<GetReservasResponse> {
  const filas = await prisma.reserva.findMany({
    orderBy: { fechaReserva: 'desc' },
    // sin include: mantenemos tipos simples como en las filminas
  })
  return { reservas: filas.map(toReserva), total: filas.length }
}

// ==============================
// Obtener una reserva por ID
// Si no existe, devuelve mensaje de error.
// ==============================
export async function getReservaById(req: GetReservaRequest): Promise<GetReservaResponse> {
  const r = await prisma.reserva.findUnique({ where: { id: req.idReserva } })
  return r ? { reserva: toReserva(r) } : { reserva: null, message: 'Reserva no encontrada' }
}

// ==============================
// Crear nueva reserva
// Valida obligatorios y evita seña negativa.
// ==============================
export async function createReserva(data: PostReservaRequest): Promise<PostReservaResponse> {
  if (!data?.idLote || !data?.idCliente || !data?.fechaReserva) {
    return { reserva: null, message: 'idLote, idCliente y fechaReserva son obligatorios' }
  }
  if (data.seña != null && data.seña < 0) {
    return { reserva: null, message: 'La seña no puede ser negativa' }
  }

  try {
    const created = await prisma.reserva.create({
      data: {
        fechaReserva: toDate(data.fechaReserva),
        loteId: data.idLote,
        clienteId: data.idCliente,
        inmobiliariaId: data.idInmobiliaria ?? null,
        sena: data.seña ?? null,
      },
    })
    return { reserva: toReserva(created), message: 'Reserva creada con éxito' }
  } catch (e: any) {
    if (e.code === 'P2002') return { reserva: null, message: 'Ya existe una reserva para ese cliente, lote y fecha' }
    throw e
  }
}

// ==============================
// Actualizar reserva existente
// Aplica sólo los campos enviados. Permite dejar inmobiliaria vacía.
// ==============================
export async function updateReserva(idReserva: number, data: PutReservaRequest): Promise<PutReservaResponse> {
  if (data.seña != null && data.seña < 0) {
    return { message: 'La seña no puede ser negativa' }
  }

  try {
    const updated = await prisma.reserva.update({
      where: { id: idReserva },
      data: {
        ...(data.fechaReserva !== undefined ? { fechaReserva: toDate(data.fechaReserva) } : {}),
        ...(typeof data.idLote === 'number' ? { loteId: data.idLote } : {}),
        ...(typeof data.idCliente === 'number' ? { clienteId: data.idCliente } : {}),
        ...(data.idInmobiliaria !== undefined ? { inmobiliariaId: data.idInmobiliaria } : {}),
        ...(data.seña !== undefined ? { sena: data.seña } : {}),
      },
    })
    return { message: 'Reserva actualizada con éxito' }
  } catch (e: any) {
    if (e.code === 'P2025') return { message: 'Reserva no encontrada' }
    if (e.code === 'P2002') return { message: 'Ya existe una reserva para ese cliente, lote y fecha' }
    throw e
  }
}

// ==============================
// Eliminar reserva
// Devuelve mensaje según resultado.
// ==============================
export async function deleteReserva(req: DeleteReservaRequest): Promise<DeleteReservaResponse> {
  try {
    await prisma.reserva.delete({ where: { id: req.idReserva } })
    return { message: 'Reserva eliminada con éxito' }
  } catch (e: any) {
    if (e.code === 'P2025') return { message: 'Reserva no encontrada' }
    throw e
  }
}
