import { DeleteLoteResponse, TipoLote as TipoLoteDto, EstadoLoteOpc as EstadoLoteDto, SubestadoLote as SubestadoLoteDto} from '../types/interfacesCCLF.d';
import { Lote, TipoLote as TipoLotePrisma, EstadoLote as EstadoLotePrisma, SubestadoLote as SubestadoLotePrisma} from '../generated/prisma';
import prisma from '../config/prisma';
import { Prisma } from '../generated/prisma';

// --------- DTO <-> PRISMA maps ----------
const tipoLoteToPrisma = (t: TipoLoteDto | undefined): TipoLotePrisma => {
  if (!t) {
    throw new Error('Tipo de lote no puede ser undefined');
  }
  const map: Record<TipoLoteDto, TipoLotePrisma> = {
    'Lote Venta': 'LOTE_VENTA',
    'Espacio Comun': 'ESPACIO_COMUN',
  };
  const result = map[t];
  if (!result) {
    throw new Error(`Tipo de lote inválido: ${t}`);
  }
  return result;
};
const estadoLoteToPrisma = (e: EstadoLoteDto | undefined): EstadoLotePrisma | undefined => {
  if (!e) return undefined;
  const map: Record<EstadoLoteDto, EstadoLotePrisma> = {
    'Disponible': 'DISPONIBLE',
    'Reservado': 'RESERVADO',
    'Vendido': 'VENDIDO',
    'No Disponible': 'NO_DISPONIBLE',
    'Alquilado': 'ALQUILADO',
    'En Promoción': 'EN_PROMOCION',
  };
  return map[e];
};
const subestadoLoteToPrisma = (s: SubestadoLoteDto | undefined): SubestadoLotePrisma | undefined => {
  if (!s) return undefined;
  const map: Record<SubestadoLoteDto, SubestadoLotePrisma> = {
    'En Construccion': 'EN_CONSTRUCCION',
    'No Construido': 'NO_CONSTRUIDO',
    'Construido': 'CONSTRUIDO',
  };
  return map[s];
};

const restrictedLoteFields = ['deuda', 'Venta', 'venta', 'Ventas', 'ventas', 'reserva', 'Reserva', 'reservas', 'Reservas'] as const;

function stripFieldsForTecnico<T>(lote: T): T {
  if (!lote) return lote;
  const sanitized: Record<string, any> = { ...(lote as Record<string, any>) };
  restrictedLoteFields.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  return sanitized as T;
}

// Normaliza filtros de query (DTO) a enums Prisma
function buildWhereFromQueryDTO(query: any, role?: string) {
  const where: any = {};

  if (query?.estado)      where.estado      = estadoLoteToPrisma(query.estado);
  if (query?.subestado)   where.subestado   = subestadoLoteToPrisma(query.subestado);
  if (query?.tipo)        where.tipo        = tipoLoteToPrisma(query.tipo);
  if (query?.propietarioId) where.propietarioId = Number(query.propietarioId) || undefined;
  if (query?.ubicacionId)   where.ubicacionId   = Number(query.ubicacionId) || undefined;

  // Los técnicos ya no se limitan a EN_CONSTRUCCION; visibilidad controlada más abajo.
  return where;
}
// ---------------------------------------

export async function getAllLotes(query: any = {}, role?: string) {
  const where = buildWhereFromQueryDTO(query, role);

  const [lotes, total] = await Promise.all([
    prisma.lote.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        // Para mostrar Calle y Número
        ubicacion: { select: { calle: true, numero: true} },
        // Para mostrar el nombre del Propietario
        propietario: { select: { nombre: true, apellido: true } },
      },
    }),
    prisma.lote.count({ where }),
  ]);

  const lotesVisibles = role === 'TECNICO'
    ? lotes.map((lote) => stripFieldsForTecnico(lote))
    : lotes;

  return { lotes: lotesVisibles, total };
}



export async function getLoteById(id: number, role?: string) {
  const lote = await prisma.lote.findUnique({ where: { id: id } });
  if (!lote) {
    const e: any = new Error('Lote no encontrado'); e.statusCode = 404; throw e;
  }

  if (role === 'TECNICO') {
    return stripFieldsForTecnico(lote);
  }
  return lote;
}


export async function createLote(data: any): Promise<Lote> {
  // La validación de Zod ya se aseguró de que los campos requeridos existan.
  // Mantenemos la lógica de negocio específica que no cubre Zod.

  // Regla: precio solo si es Lote Venta
  if (data.tipo === 'Lote Venta' && data.precio == null) {
    const error: any = new Error('El precio es obligatorio para "Lote Venta"');
    error.statusCode = 400;
    throw error;
  }
  if (data.tipo === 'Espacio Comun' && data.precio != null) {
    const error: any = new Error('El precio no aplica para "Espacio Comun"');
    error.statusCode = 400;
    throw error;
  }

  // Crear lote. `data` tiene la forma del schema de Zod.
  return prisma.lote.create({
    data: {
      // Mapeo de DTO a Prisma
      tipo: tipoLoteToPrisma(data.tipo),
      estado: estadoLoteToPrisma(data.estado),
      subestado: subestadoLoteToPrisma(data.subestado),

      // Campos directos desde el DTO validado por Zod
      descripcion: data.descripcion,
      frente: data.frente,
      fondo: data.fondo,
      superficie: data.superficie,
      precio: data.precio,
      numPartido: data.numPartido,
      alquiler: data.alquiler,
      deuda: data.deuda,
      nombreEspacioComun: data.nombreEspacioComun,
      capacidad: data.capacidad,

      // Relaciones por ID
      fraccion: { connect: { id: data.fraccionId } },
      propietario: { connect: { id: data.propietarioId } },
      ...(data.ubicacionId && { ubicacion: { connect: { id: data.ubicacionId } } }),
    },
  });
}

export async function updatedLote(id: number, data: any, role?: string): Promise<Lote> {
  let payload = data;
  if (role === 'TECNICO') {
    const allowedFields = ['subestado', 'frente', 'fondo', 'superficie', 'archivos'];
    const filtered: Record<string, any> = {};
    Object.keys(data || {}).forEach((field) => {
      if (allowedFields.includes(field)) {
        filtered[field] = data[field];
      }
    });

    if (Object.keys(filtered).length === 0) {
      const e: any = new Error('Como TECNICO, solo puedes modificar los campos: subestado, frente, fondo, superficie y archivos (planos)');
      e.statusCode = 403;
      throw e;
    }
    payload = filtered;
  }

  // La autorización para TECNICO ya fue manejada por el middleware y la lógica en getLoteById.
  // Aquí solo transformamos el DTO para la actualización.
  const dataToUpdate: Prisma.LoteUpdateInput = {};
  const { estado, subestado, tipo, propietarioId, ubicacionId, fraccionId, ...rest } = payload;

  if (estado) dataToUpdate.estado = estadoLoteToPrisma(estado);
  if (subestado) dataToUpdate.subestado = subestadoLoteToPrisma(subestado);
  if (tipo) dataToUpdate.tipo = tipoLoteToPrisma(tipo);
  if (propietarioId) dataToUpdate.propietario = { connect: { id: propietarioId } };
  if (ubicacionId) dataToUpdate.ubicacion = { connect: { id: ubicacionId } };
  if (fraccionId) dataToUpdate.fraccion = { connect: { id: fraccionId } };

  // Asignar el resto de los campos
  Object.assign(dataToUpdate, rest);

  try {
    return await prisma.lote.update({
      where: { id },
      data: dataToUpdate,
    });
  } catch (e: any) {
    if (e.code === 'P2025') { // Código de error de Prisma para "registro no encontrado"
      const error = new Error('Lote no encontrado');
      (error as any).statusCode = 404;
      throw error;
    }
    throw e; // Re-lanzar otros errores
  }
}

export async function deleteLote(id: number, role?: string): Promise<DeleteLoteResponse> {
  if (role === 'TECNICO') {
    const e: any = new Error('Los técnicos no están autorizados para eliminar lotes');
    e.statusCode = 403;
    throw e;
  }
  await prisma.lote.delete({ where: { id: id } });
  return { message: 'Lote eliminado correctamente' };
}

export async function updateLoteState(id: number, newState: EstadoLoteDto): Promise<Lote> {
  return prisma.lote.update({
    where: { id },
    data: { estado: estadoLoteToPrisma(newState) },
  });
}