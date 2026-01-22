import {
    Inmobiliaria,
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
import { Inmobiliaria as PrismaInmobiliaria } from '../generated/prisma';
import prisma from '../config/prisma';
import { Prisma } from '../generated/prisma';

// 2. Mapeamos los nuevos campos en el helper
const toInmobiliaria = (i: PrismaInmobiliaria & { _count?: { ventas?: number; reservas?: number } }): Inmobiliaria => ({
    idInmobiliaria: i.id,
    nombre: i.nombre,
    razonSocial: i.razonSocial,
    contacto: i.contacto ?? undefined,
    comxventa: i.comxventa ? parseFloat(i.comxventa.toString()) : undefined,
    // Nuevos campos:
    estado: i.estadoOperativo, 
    fechaBaja: i.fechaBaja ? i.fechaBaja.toISOString() : undefined,
});

// ==============================
// Obtener todas las Inmobiliarias
// ==============================
export async function getAllInmobiliarias(filters?: { estadoOperativo?: string }): Promise<GetInmobiliariasResponse> {
  const whereClause: any = {};
  
  // Filtro estadoOperativo: default OPERATIVO si no viene
  if (filters?.estadoOperativo) {
    whereClause.estadoOperativo = filters.estadoOperativo;
  } else {
    whereClause.estadoOperativo = 'OPERATIVO'; // Default: solo operativas
  }
  
  const [rows, total] = await Promise.all([
    prisma.inmobiliaria.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { ventas: true, reservas: true }
        }
      }
    }),
    prisma.inmobiliaria.count(),
  ]);
  
  const inmobiliarias = rows.map((i) => {
    const base = toInmobiliaria(i);
    return {
      ...base,
      cantidadVentas: i._count?.ventas ?? 0,
      cantidadReservas: i._count?.reservas ?? 0,
      createdAt: i.createdAt,
      updateAt: i.updateAt,
    };
  });
  
  return { inmobiliarias, total };
}

// ==============================
// Obtener una Inmobiliaria por ID
// ==============================
export async function getInmobiliariaById(req: GetInmobiliariaRequest): Promise<GetInmobiliariaResponse> {
    const inmobiliaria = await prisma.inmobiliaria.findUnique({
        where: { id: req.idInmobiliaria },
        include: {
            _count: {
                select: { ventas: true, reservas: true }
            }
        }
    });
    
    if (!inmobiliaria) {
        return { inmobiliaria: null, message: 'Inmobiliaria no encontrada' };
    }
    
    const mapped = toInmobiliaria(inmobiliaria);
    return { 
        inmobiliaria: {
            ...mapped,
            cantidadVentas: inmobiliaria._count?.ventas ?? 0,
            cantidadReservas: inmobiliaria._count?.reservas ?? 0,
            createdAt: inmobiliaria.createdAt,
            updateAt: inmobiliaria.updateAt,
        } as any
    };
}


// ==============================
// Crear nueva Inmobiliaria
// ==============================
export async function createInmobiliaria(req: PostInmobiliariaRequest): Promise<PostInmobiliariaResponse> {
    const inmobiliaria = await prisma.inmobiliaria.findFirst({
        where: { nombre: req.nombre }
    });
    
    if (inmobiliaria) {
        const error = new Error('Advertencia: Ya existe una inmobiliaria con ese nombre');
        (error as any).statusCode = 400;
        throw error;
    }

    const newInmobiliaria = await prisma.inmobiliaria.create({
        data: {
            nombre: req.nombre,
            razonSocial: req.razonSocial,
            contacto: req.contacto ?? undefined,
            comxventa: req.comxventa != null ? new Prisma.Decimal(req.comxventa) : undefined,
            user: req.userId != null ? { connect: { id: req.userId } } : undefined,
            createdAt: new Date(),
            // Por defecto nace OPERATIVA (aunque Prisma lo hace por default, es bueno ser explícito)
            estadoOperativo: 'OPERATIVO', 
            fechaBaja: null
        }
    });
    return { inmobiliaria: toInmobiliaria(newInmobiliaria), message: 'Inmobiliaria creada exitosamente' };
}

// ==============================
// Actualizar Inmobiliaria existente
// ==============================
export async function updateInmobiliaria(idActual: number, updateData: PutInmobiliariaRequest): Promise<PutInmobiliariaResponse> {
  // Verificamos existencia
  const existing = await prisma.inmobiliaria.findUnique({ where: { id: idActual } });
  if (!existing) {
    const e = new Error('Inmobiliaria no encontrada'); (e as any).statusCode = 404; throw e;
  }

  // Bloquear updates si está eliminado
  if (existing.estadoOperativo === 'ELIMINADO') {
    const e = new Error('No se puede editar una inmobiliaria eliminada') as any;
    e.statusCode = 409;
    throw e;
  }

  // Verificamos duplicados de nombre
  if (updateData.nombre) {
    const dup = await prisma.inmobiliaria.findFirst({
      where: { nombre: updateData.nombre, NOT: { id: idActual } },
      select: { id: true },
    });
    if (dup) {
      const e = new Error('El nombre ya existe'); (e as any).statusCode = 400; throw e;
    }
  }

  // IMPORTANTE: NO permitir cambios de estadoOperativo desde update
  // Solo endpoints de desactivar/reactivar pueden cambiar estadoOperativo
  // Ignorar cualquier campo estado/estadoOperativo que venga en updateData

  const updated = await prisma.inmobiliaria.update({
    where: { id: idActual },
    data: {
      ...(updateData.nombre        !== undefined ? { nombre: updateData.nombre } : {}),
      ...(updateData.razonSocial   !== undefined ? { razonSocial: updateData.razonSocial } : {}),
      ...(updateData.contacto      !== undefined ? { contacto: updateData.contacto } : {}),
      ...(updateData.comxventa      !== undefined ? { comxventa: new Prisma.Decimal(updateData.comxventa) } : {}),
      ...(updateData.userId         !== undefined ? { userId: updateData.userId } : {}),
      
      // NO incluir estadoOperativo ni fechaBaja - solo endpoints específicos pueden cambiarlos
      updateAt: new Date(), 
    },
    include: {
      _count: {
        select: { ventas: true, reservas: true }
      }
    }
  });

  const mapped = toInmobiliaria(updated);
  return { 
    inmobiliaria: {
      ...mapped,
      cantidadVentas: updated._count?.ventas ?? 0,
      cantidadReservas: updated._count?.reservas ?? 0,
      createdAt: updated.createdAt,
      updateAt: updated.updateAt,
    } as any,
    message: 'Inmobiliaria actualizada correctamente' 
  };
}

// ==============================
// Eliminar Inmobiliaria (Hard Delete)
// ==============================
// Eliminar Inmobiliaria (soft delete - estadoOperativo)
// ==============================
export async function eliminarInmobiliaria(id: number): Promise<PutInmobiliariaResponse> {
  try {
    const existing = await prisma.inmobiliaria.findUnique({
      where: { id },
    });

    if (!existing) {
      const error = new Error('Inmobiliaria no encontrada') as any;
      error.statusCode = 404;
      throw error;
    }

    if (existing.estadoOperativo === 'ELIMINADO') {
      const error = new Error('La inmobiliaria ya está eliminada.') as any;
      error.statusCode = 409;
      throw error;
    }

    const updated = await prisma.inmobiliaria.update({
      where: { id },
      data: {
        estadoOperativo: 'ELIMINADO',
        fechaBaja: new Date(),
        updateAt: new Date(),
      },
      include: {
        _count: {
          select: { ventas: true, reservas: true }
        }
      }
    });

    const mapped = toInmobiliaria(updated);
    return { 
      inmobiliaria: {
        ...mapped,
        cantidadVentas: updated._count?.ventas ?? 0,
        cantidadReservas: updated._count?.reservas ?? 0,
        createdAt: updated.createdAt,
        updateAt: updated.updateAt,
      } as any,
      message: 'Inmobiliaria eliminada correctamente' 
    };
  } catch (error) {
    throw error;
  }
}

// ==============================
// Reactivar Inmobiliaria (estadoOperativo)
// ==============================
export async function reactivarInmobiliaria(id: number): Promise<PutInmobiliariaResponse> {
  try {
    const existing = await prisma.inmobiliaria.findUnique({
      where: { id },
    });

    if (!existing) {
      const error = new Error('Inmobiliaria no encontrada') as any;
      error.statusCode = 404;
      throw error;
    }

    if (existing.estadoOperativo === 'OPERATIVO') {
      const error = new Error('La inmobiliaria ya está operativa.') as any;
      error.statusCode = 409;
      throw error;
    }

    const updated = await prisma.inmobiliaria.update({
      where: { id },
      data: {
        estadoOperativo: 'OPERATIVO',
        fechaBaja: null,
        updateAt: new Date(),
      },
      include: {
        _count: {
          select: { ventas: true, reservas: true }
        }
      }
    });

    const mapped = toInmobiliaria(updated);
    return { 
      inmobiliaria: {
        ...mapped,
        cantidadVentas: updated._count?.ventas ?? 0,
        cantidadReservas: updated._count?.reservas ?? 0,
        createdAt: updated.createdAt,
        updateAt: updated.updateAt,
      } as any,
      message: 'Inmobiliaria reactivada correctamente' 
    };
  } catch (error) {
    throw error;
  }
}

// ==============================
export async function deleteInmobiliaria(req: DeleteInmobiliariaRequest): Promise<DeleteInmobiliariaResponse> {
    try {
        await prisma.inmobiliaria.delete({
            where: { id: req.idInmobiliaria },
        });
        return { message: 'Inmobiliaria eliminada correctamente' };
    } catch (e: any) {
        if (e.code === 'P2025') {
            const error = new Error('Inmobiliaria no encontrada');
            (error as any).statusCode = 404;
            throw error;
        }
        throw e;
    }
}