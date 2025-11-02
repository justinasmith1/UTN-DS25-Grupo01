import{
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

const toInmobiliaria = (i: PrismaInmobiliaria & { _count?: { ventas?: number } }): Inmobiliaria => ({
    idInmobiliaria: i.id,
    nombre: i.nombre,
    razonSocial: i.razonSocial,
    contacto: i.contacto ?? undefined,
    comxventa: i.comxventa ? parseFloat(i.comxventa.toString()) : undefined,
});

// ==============================
// Obtener todas las Inmobiliarias
// ==============================
// Retorna el listado completo de Inmobiliarias junto con el total.
export async function getAllInmobiliarias(): Promise<GetInmobiliariasResponse> {
  const [rows, total] = await Promise.all([
    prisma.inmobiliaria.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { ventas: true }
        }
      }
    }),
    prisma.inmobiliaria.count(),
  ]);
  
  // Mapear incluyendo el conteo de ventas y las fechas
  const inmobiliarias = rows.map((i) => {
    const base = toInmobiliaria(i);
    return {
      ...base,
      cantidadVentas: i._count?.ventas ?? 0,
      createdAt: i.createdAt,
      updateAt: i.updateAt,
    };
  });
  
  return { inmobiliarias, total };
}
// ==============================
// Obtener una Inmobiliaria por ID
// ==============================
// Busca dentro de la BD la Inmobiliaria cuyo ID coincida con el solicitado.
// Si no existe, devuelve un mensaje de error.
export async function getInmobiliariaById(req: GetInmobiliariaRequest): Promise<GetInmobiliariaResponse> {
    const inmobiliaria = await prisma.inmobiliaria.findUnique({
        where: { id: req.idInmobiliaria },
        include: {
            _count: {
                select: { ventas: true }
            }
        }
    });
    
    if (!inmobiliaria) {
        return { inmobiliaria: null, message: 'Inmobiliaria no encontrada' };
    }
    
    // Incluir conteo de ventas y fechas
    const mapped = toInmobiliaria(inmobiliaria);
    return { 
        inmobiliaria: {
            ...mapped,
            cantidadVentas: inmobiliaria._count?.ventas ?? 0,
            createdAt: inmobiliaria.createdAt,
            updateAt: inmobiliaria.updateAt,
        } as any
    };
}


// ==============================
// Crear nueva Inmobiliaria
// ==============================
// Agrega una nueva Inmobiliaria a la BD.
// Se hace una validacion para evitar duplicados de lote + cliente en la misma fecha.
export async function createInmobiliaria(req: PostInmobiliariaRequest): Promise<PostInmobiliariaResponse> {
    const inmobiliaria = await prisma.inmobiliaria.findFirst({
    where: { nombre: req.nombre }});
    if (inmobiliaria) {
        const error = new Error('Advertencia: Ya existe una inmobiliaria con ese nombre');
        (error as any).statusCode = 400;
        throw error;
    }

    const newInmobiliaria = await prisma.inmobiliaria.create({
        data: {
            nombre: req.nombre,
            razonSocial: req.razonSocial,
            // Asignar undefined a los campos opcionales si no se proporcionan
            contacto: req.contacto ?? undefined,
            comxventa: req.comxventa != null ? new Prisma.Decimal(req.comxventa) : undefined,
            // Relacionando por FK directa 
            user:   req.userId  != null ? { connect: { id: req.userId  } } : undefined,
            createdAt: new Date(),
            updateAt: undefined,
        }
    });
    return { inmobiliaria: toInmobiliaria(newInmobiliaria), message: 'Inmobiliaria creada exitosamente' };
}
// ==============================
// Actualizar Inmobiliaria existente
// ==============================
// Busca la Inmobiliaria por ID y, si existe, reemplaza sus datos con los nuevos recibidos.
// Devuelve mensaje segun resultado.
export async function updateInmobiliaria(idActual: number, updateData: PutInmobiliariaRequest): Promise<PutInmobiliariaResponse> {
  // 404 si no existe
  const existing = await prisma.inmobiliaria.findUnique({ where: { id: idActual } });
  if (!existing) {
    const e = new Error('Inmobiliaria no encontrada'); (e as any).statusCode = 404; throw e;
  }

  // Duplicado por nombre (si viene nombre)
  if (updateData.nombre) {
    const dup = await prisma.inmobiliaria.findFirst({
      where: { nombre: updateData.nombre, NOT: { id: idActual } },
      select: { id: true },
    });
    if (dup) {
      const e = new Error('El nombre ya existe'); (e as any).statusCode = 400; throw e;
    }
  }

  const updated = await prisma.inmobiliaria.update({
    where: { id: idActual },
    data: {
      ...(updateData.nombre        !== undefined ? { nombre: updateData.nombre } : {}),
      ...(updateData.razonSocial   !== undefined ? { razonSocial: updateData.razonSocial } : {}),
      ...(updateData.contacto      !== undefined ? { contacto: updateData.contacto } : {}),
      ...(updateData.comxventa     !== undefined ? { comxventa: new Prisma.Decimal(updateData.comxventa) } : {}),
      ...(updateData.userId        !== undefined ? { userId: updateData.userId } : {}),
      updateAt: new Date(), 
    },
    include: {
      _count: {
        select: { ventas: true }
      }
    }
  });

  // Incluir conteo de ventas y fechas en la respuesta
  const mapped = toInmobiliaria(updated);
  return { 
    inmobiliaria: {
      ...mapped,
      cantidadVentas: updated._count?.ventas ?? 0,
      createdAt: updated.createdAt,
      updateAt: updated.updateAt,
    } as any,
    message: 'Inmobiliaria actualizada correctamente' 
  };
}
// ==============================
// Eliminar Inmobiliaria
// ==============================
// Elimina de la BD la Inmobiliaria que coincida con el ID especificado.
// Devuelve mensaje segun exito o error.
export async function deleteInmobiliaria(req: DeleteInmobiliariaRequest): Promise<DeleteInmobiliariaResponse> {
    try {
        await prisma.inmobiliaria.delete({
            where: { id: req.idInmobiliaria },
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