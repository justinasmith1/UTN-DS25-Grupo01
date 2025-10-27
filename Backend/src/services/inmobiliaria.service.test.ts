import {
  getAllInmobiliarias,
  getInmobiliariaById,
  createInmobiliaria,
  updateInmobiliaria,
  deleteInmobiliaria,
} from './inmobiliaria.service';
import prisma from '../config/prisma';
import { Prisma } from '../generated/prisma';
// ARRANGE GLOBAL: mock del cliente Prisma usado por el servicio.
jest.mock('../config/prisma', () => ({
  inmobiliaria: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
// ARRANGE GLOBAL: limpiar mocks entre pruebas.
afterEach(() => {
  jest.clearAllMocks();
});
// --- Tests para getAllInmobiliarias ---
describe('getAllInmobiliarias', () => {
  test('debe retornar inmobiliarias mapeadas y el total', async () => {
    // ARRANGE
    const mockRows = [
      {
        id: 1,
        nombre: 'Horizonte SRL',
        razonSocial: 'Horizonte Desarrollos SRL',
        contacto: 'ventas@horizonte.com,1122334455',
        comxventa: { toString: () => '5.50' },
      },
      {
        id: 2,
        nombre: 'Campo Norte',
        razonSocial: 'Campo Norte SA',
        contacto: null,
        comxventa: null,
      },
    ];
    (prisma.inmobiliaria.findMany as jest.Mock).mockResolvedValue(mockRows);
    (prisma.inmobiliaria.count as jest.Mock).mockResolvedValue(2);
    // ACT
    const result = await getAllInmobiliarias();
    // ASSERT
    expect(result).toEqual({
      inmobiliarias: [
        {
          idInmobiliaria: 1,
          nombre: 'Horizonte SRL',
          razonSocial: 'Horizonte Desarrollos SRL',
          contacto: 'ventas@horizonte.com,1122334455',
          comxventa: 5.5,
        },
        {
          idInmobiliaria: 2,
          nombre: 'Campo Norte',
          razonSocial: 'Campo Norte SA',
          contacto: undefined,
          comxventa: undefined,
        },
      ],
      total: 2,
    });
    expect(prisma.inmobiliaria.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    expect(prisma.inmobiliaria.count).toHaveBeenCalled();
  });
});
// --- Tests para getInmobiliariaById ---
describe('getInmobiliariaById', () => {
  test('debe retornar la inmobiliaria cuando existe', async () => {
    // ARRANGE
    const mockRow = {
      id: 3,
      nombre: 'La Colina',
      razonSocial: 'La Colina Inmobiliaria',
      contacto: 'info@lacolina.com',
      comxventa: { toString: () => '3.25' },
    };
    (prisma.inmobiliaria.findUnique as jest.Mock).mockResolvedValue(mockRow);
    // ACT
    const result = await getInmobiliariaById({ idInmobiliaria: 3 });
    // ASSERT
    expect(result).toEqual({
      inmobiliaria: {
        idInmobiliaria: 3,
        nombre: 'La Colina',
        razonSocial: 'La Colina Inmobiliaria',
        contacto: 'info@lacolina.com',
        comxventa: 3.25,
      },
    });
    expect(prisma.inmobiliaria.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
    });
  });
  test('debe retornar null y mensaje cuando no existe', async () => {
    // ARRANGE
    (prisma.inmobiliaria.findUnique as jest.Mock).mockResolvedValue(null);
    // ACT
    const result = await getInmobiliariaById({ idInmobiliaria: 999 });
    // ASSERT
    expect(result).toEqual({
      inmobiliaria: null,
      message: 'Inmobiliaria no encontrada',
    });
  });
});
// --- Tests para createInmobiliaria ---
describe('createInmobiliaria', () => {
  test('debe crear una inmobiliaria cuando no existe duplicado', async () => {
    // ARRANGE
    const payload = {
      nombre: 'Ribera Urbana',
      razonSocial: 'Ribera Urbana SA',
      contacto: 'contacto@ribera.com',
      comxventa: 7.75,
      userId: 12,
    };
    (prisma.inmobiliaria.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.inmobiliaria.create as jest.Mock).mockResolvedValue({
      id: 10,
      nombre: payload.nombre,
      razonSocial: payload.razonSocial,
      contacto: payload.contacto,
      comxventa: { toString: () => payload.comxventa!.toString() },
    });
    // ACT
    const result = await createInmobiliaria(payload);
    // ASSERT
    expect(prisma.inmobiliaria.findFirst).toHaveBeenCalledWith({
      where: { nombre: payload.nombre },
    });
    const createArgs = (prisma.inmobiliaria.create as jest.Mock).mock.calls[0][0];
    expect(createArgs.data.nombre).toBe(payload.nombre);
    expect(createArgs.data.razonSocial).toBe(payload.razonSocial);
    expect(createArgs.data.contacto).toBe(payload.contacto);
    expect(createArgs.data.user).toEqual({ connect: { id: payload.userId } });
    expect(createArgs.data.comxventa).toBeInstanceOf(Prisma.Decimal);
    expect(createArgs.data.createdAt).toBeInstanceOf(Date);
    expect(createArgs.data.updateAt).toBeUndefined();
    expect(result).toEqual({
      inmobiliaria: {
        idInmobiliaria: 10,
        nombre: payload.nombre,
        razonSocial: payload.razonSocial,
        contacto: payload.contacto,
        comxventa: payload.comxventa,
      },
      message: 'Inmobiliaria creada exitosamente',
    });
  });
  test('debe lanzar error 400 si existe una inmobiliaria con el mismo nombre', async () => {
    // ARRANGE
    const payload = {
      nombre: 'Duplicada',
      razonSocial: 'Duplicada SA',
      comxventa: 4,
    };
    (prisma.inmobiliaria.findFirst as jest.Mock).mockResolvedValue({
      id: 8,
      nombre: 'Duplicada',
    });
    // ACT & ASSERT
    await expect(createInmobiliaria(payload as any)).rejects.toThrow(
      'Advertencia: Ya existe una inmobiliaria con ese nombre',
    );
    await expect(createInmobiliaria(payload as any)).rejects.toHaveProperty('statusCode', 400);
    expect(prisma.inmobiliaria.create).not.toHaveBeenCalled();
  });
});
// --- Tests para updateInmobiliaria ---
describe('updateInmobiliaria', () => {
  test('debe actualizar una inmobiliaria cuando existe y no hay duplicados', async () => {
    // ARRANGE
    const id = 5;
    const updateData = {
      nombre: 'Nueva Vista',
      razonSocial: 'Nueva Vista SA',
      comxventa: 6.15,
      contacto: 'ventas@nuevavista.com',
    };
    (prisma.inmobiliaria.findUnique as jest.Mock).mockResolvedValue({
      id,
      nombre: 'Vista Original',
      razonSocial: 'Vista Original SA',
    });
    (prisma.inmobiliaria.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.inmobiliaria.update as jest.Mock).mockResolvedValue(undefined);
    // ACT
    const result = await updateInmobiliaria(id, updateData);
    // ASSERT
    expect(prisma.inmobiliaria.findUnique).toHaveBeenCalledWith({ where: { id } });
    expect(prisma.inmobiliaria.findFirst).toHaveBeenCalledWith({
      where: { nombre: updateData.nombre, NOT: { id } },
      select: { id: true },
    });
    const updateArgs = (prisma.inmobiliaria.update as jest.Mock).mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id });
    expect(updateArgs.data.nombre).toBe(updateData.nombre);
    expect(updateArgs.data.razonSocial).toBe(updateData.razonSocial);
    expect(updateArgs.data.contacto).toBe(updateData.contacto);
    expect(updateArgs.data.comxventa).toBeInstanceOf(Prisma.Decimal);
    expect(updateArgs.data.updateAt).toBeInstanceOf(Date);
    expect(result).toEqual({ message: 'Inmobiliaria actualizada correctamente' });
  });
  test('debe lanzar error 404 cuando la inmobiliaria no existe', async () => {
    // ARRANGE
    (prisma.inmobiliaria.findUnique as jest.Mock).mockResolvedValue(null);
    // ACT & ASSERT
    await expect(updateInmobiliaria(999, { nombre: 'N/A' })).rejects.toThrow('Inmobiliaria no encontrada');
    await expect(updateInmobiliaria(999, { nombre: 'N/A' })).rejects.toHaveProperty('statusCode', 404);
    expect(prisma.inmobiliaria.update).not.toHaveBeenCalled();
  });
  test('debe lanzar error 400 si el nombre nuevo ya existe en otra inmobiliaria', async () => {
    // ARRANGE
    const id = 6;
    (prisma.inmobiliaria.findUnique as jest.Mock).mockResolvedValue({ id });
    (prisma.inmobiliaria.findFirst as jest.Mock).mockResolvedValue({ id: 2 });
    // ACT & ASSERT
    await expect(updateInmobiliaria(id, { nombre: 'Duplicada' })).rejects.toThrow('El nombre ya existe');
    await expect(updateInmobiliaria(id, { nombre: 'Duplicada' })).rejects.toHaveProperty('statusCode', 400);
    expect(prisma.inmobiliaria.update).not.toHaveBeenCalled();
  });
});
// --- Tests para deleteInmobiliaria ---
describe('deleteInmobiliaria', () => {
  test('debe eliminar una inmobiliaria y retornar mensaje', async () => {
    // ARRANGE
    (prisma.inmobiliaria.delete as jest.Mock).mockResolvedValue({ id: 4 });
    // ACT
    const result = await deleteInmobiliaria({ idInmobiliaria: 4 });
    // ASSERT
    expect(prisma.inmobiliaria.delete).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(result).toEqual({ message: 'Inmobiliaria eliminada correctamente' });
  });
  test('debe lanzar error 404 si Prisma devuelve P2025', async () => {
    // ARRANGE
    const prismaError = { code: 'P2025' };
    (prisma.inmobiliaria.delete as jest.Mock).mockRejectedValue(prismaError);
    // ACT & ASSERT
    await expect(deleteInmobiliaria({ idInmobiliaria: 123 })).rejects.toThrow('Inmobiliaria no encontrada');
    await expect(deleteInmobiliaria({ idInmobiliaria: 123 })).rejects.toHaveProperty('statusCode', 404);
  });
});