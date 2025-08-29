import { DeleteLoteResponse, PostLoteRequest, TipoLote as TipoLoteDto, EstadoLoteOpc as EstadoLoteDto, SubestadoLote as SubestadoLoteDto} from '../types/interfacesCCLF.d';
import { Lote, TipoLote as TipoLotePrisma, EstadoLote as EstadoLotePrisma, SubestadoLote as SubestadoLotePrisma} from '../generated/prisma';
import prisma from '../config/prisma';
import { Prisma } from '../generated/prisma';

// Prisma -> DTO
const tipoLoteToDto = (tipo: TipoLotePrisma): TipoLoteDto => {
  const map: Record<TipoLotePrisma, TipoLoteDto> = {
    LOTE_VENTA: "Lote Venta",
    ESPACIO_COMUN: "Espacio Comun",
  };
  return map[tipo];
};

// DTO -> Prisma
const tipoLoteToPrisma = (tipo: TipoLoteDto): TipoLotePrisma => {
  const map: Record<TipoLoteDto, TipoLotePrisma> = {
    "Lote Venta": "LOTE_VENTA",
    "Espacio Comun": "ESPACIO_COMUN",
  };
  return map[tipo];
};

// Ejemplo para EstadoLoteOpc
const estadoLoteToDto = (estado: EstadoLotePrisma): EstadoLoteDto => {
  const map: Record<EstadoLotePrisma, EstadoLoteDto> = {
    DISPONIBLE: "Disponible",
    RESERVADO: "Reservado",
    VENDIDO: "Vendido",
    NO_DISPONIBLE: "No Disponible",
    ALQUILADO: "Alquilado",
    EN_PROMOCION: "En Promoción",
  };
  return map[estado];
};

// DTO -> Prisma para EstadoLoteOpc
const estadoLoteToPrisma = (estado: EstadoLoteDto): EstadoLotePrisma => {
  const map: Record<EstadoLoteDto, EstadoLotePrisma> = {
    "Disponible": "DISPONIBLE",
    "Reservado": "RESERVADO",
    "Vendido": "VENDIDO",
    "No Disponible": "NO_DISPONIBLE",
    "Alquilado": "ALQUILADO",
    "En Promoción": "EN_PROMOCION",
  };
  return map[estado];
};

// Ejemplo para SubestadoLote
const subestadoLoteToDto = (subestado: SubestadoLotePrisma): SubestadoLoteDto => {
  const map: Record<SubestadoLotePrisma, SubestadoLoteDto> = {
    EN_CONSTRUCCION: "En Construccion",
    NO_CONSTRUIDO: "No Construido",
    CONSTRUIDO: "Construido",
  };
  return map[subestado];
};

// DTO -> Prisma para SubestadoLote
const subestadoLoteToPrisma = (subestado: SubestadoLoteDto): SubestadoLotePrisma => {
  const map: Record<SubestadoLoteDto, SubestadoLotePrisma> = {
    "En Construccion": "EN_CONSTRUCCION",
    "No Construido": "NO_CONSTRUIDO",
    "Construido": "CONSTRUIDO",
  };
  return map[subestado];
};




//export const getLotes = async (): Promise<Lote[]> => lotes;
export async function getAllLotes(): Promise<Lote[]> {
  const lotes = await prisma.lote.findMany({
    orderBy: {
      id: 'asc',
    },
  });
  return lotes;
}

export const getLotesById = async (id: number): Promise<Lote | undefined> => {
  const lote = await prisma.lote.findUnique({
    where: { id },});
    if (!lote) {
      const error = new Error('Lote no encontrado');
      (error as any).statusCode = 404;
      throw error;
    }
  return lote;
};

export async function createLote(data: PostLoteRequest): Promise<Lote> {
  const lote = await prisma.lote.findFirst({
  where: { id: data.id }});
  if (lote) {
      const error = new Error('Ya existe un lote con ese ID');
      (error as any).statusCode = 400;
      throw error;
  }

  const newLote = await prisma.lote.create({
      data: {
          tipo: tipoLoteToPrisma(data.tipo),
          descripcion: data.descripcion ?? undefined,
          frente: data.frente != null ? new Prisma.Decimal(data.frente) : undefined,
          fondo: data.fondo != null ? new Prisma.Decimal(data.fondo) : undefined, 
          superficie: data.superficie != null ? new Prisma.Decimal(data.superficie) : undefined,
          precio: data.precio != null ? new Prisma.Decimal(data.precio) : undefined,
          estado: estadoLoteToPrisma(data.estado),
          subestado: subestadoLoteToPrisma(data.subestado),
          alquiler: data.alquiler ?? undefined,
          deuda: data.deuda ?? undefined,
          nombreEspacioComun: data.nombreEspacioComun ?? undefined,
          capacidad: data.capacidad ?? undefined, 
          // Relacionando por FK directa
          fraccion: { connect: { id: data.fraccion.idFraccion } },
          ubicacion: { connect: { id: data.ubicacion?.id } },
          propietario: { connect: { id: data.propietario.idPersona } },  
          createdAt: new Date(),
          updateAt: undefined,
      },
  });
  return newLote;
}

export async function updatedLote(id: number, data: Partial<Lote>): Promise<Lote> {
  if (data.propietarioId) {
    const propietario = await prisma.persona.findUnique({
      where: { id: data.propietarioId },
    });
    if (!propietario) {
      const error = new Error('Propietario no encontrado');
      (error as any).statusCode = 404;
      throw error;
    }
  }

  try {
    const updatedLote = await prisma.lote.update({
      where: { id },
      data: {
        ...data,
        updateAt: new Date(),
      },
    });
    return updatedLote;
  } catch (error) {
    console.error('Lote no encontrado:', error);
    throw new Error('Lote no encontrado');
  }
}

export async function deleteLote(id: number): Promise<DeleteLoteResponse> {
  try {
    await prisma.lote.delete({
      where: { id },
    });
    return { message: 'Lote eliminado correctamente' };
  } catch (e: any) {
        if (e.code === 'P2025') { // Código de error de Prisma para "registro no encontrado"
            const error = new Error('Lote no encontrado');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e; // Re-lanzar otros errores
    }
  }
