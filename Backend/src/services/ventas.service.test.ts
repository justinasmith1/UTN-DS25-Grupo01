
import { getAllVentas, getVentaById, createVenta, updateVenta, deleteVenta } from './venta.service';
import prisma from '../config/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { EstadoVenta, Lote, Venta, EstadoLote, TipoLote, SubestadoLote } from '../generated/prisma';
import type { PostVentaRequest, PutVentaRequest } from '../types/interfacesCCLF';

// ARRANGE GLOBAL: Mockeamos el módulo de Prisma a nivel global.
jest.mock('../config/prisma', () => ({
    venta: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    lote: {
        findUnique: jest.fn(),
    },
    persona: {
        findUnique: jest.fn(),
    },
    inmobiliaria: {
        findUnique: jest.fn(),
    },
}));

// ARRANGE GLOBAL: Limpio los mocks después de cada prueba para evitar interferencias.
afterEach(() => {
    jest.clearAllMocks();
});

//--- Tests para getAllVentas ---
describe('getAllVentas', () => {
    test('debe retornar una lista de ventas con sus compradores', async () => {
        // ARRANGE: Defino una lista de ventas de ejemplo que coincide con el schema.prisma.
        const mockVentas: Venta[] = [
            {
                id: 1,
                loteId: 1,
                fechaVenta: new Date('2025-10-01T10:00:00.000Z'),
                monto: Decimal(50000.45), // Prisma Decimal se maneja como number en JS.
                estado: 'ESCRITURADO' as EstadoVenta, // Usamos un valor del enum EstadoVenta.
                plazoEscritura: null,
                tipoPago: 'CONTADO',
                compradorId: 10,
                inmobiliariaId: null,
                reservaId: null,
                createdAt: new Date('2025-10-01T10:00:00.000Z'),
                updateAt: new Date('2025-10-05T15:00:00.000Z'),
            },
            {
                id: 2,
                loteId: 2,
                fechaVenta: new Date('2025-11-15T12:30:00.000Z'),
                monto:  Decimal(75000.50),
                estado: 'INICIADA' as EstadoVenta,
                plazoEscritura: new Date('2026-02-15T12:30:00.000Z'),
                tipoPago: 'FINANCIADO',
                compradorId: 12,
                inmobiliariaId: 5,
                reservaId: 1,
                createdAt: new Date('2025-11-15T12:30:00.000Z'),
                updateAt: new Date('2025-11-15T12:30:00.000Z'),
            },
        ];
        (prisma.venta.findMany as jest.Mock).mockResolvedValue(mockVentas);

        // ACT: Ejecutamos la función.
        const result = await getAllVentas();

        // ASSERT: Verificamos el resultado y que la función de Prisma haya sido llamada correctamente.
        expect(result).toEqual(mockVentas);
        expect(prisma.venta.findMany).toHaveBeenCalledWith({
            include: { comprador: true },
            orderBy: { id: 'asc' },
        });
    });
});

//--- Tests para getVentaById ---
describe('getVentaById', () => {
    test('debe retornar una venta cuando se proporciona un ID existente', async () => {
        // ARRANGE
        const mockVenta: Venta = {
            id: 1,
            loteId: 1,
            fechaVenta: new Date('2025-10-01T10:00:00.000Z'),
            monto: Decimal(50000.00),
            estado: 'ESCRITURADO' as EstadoVenta,
            plazoEscritura: null,
            tipoPago: 'CONTADO',
            compradorId: 10,
            inmobiliariaId: null,
            reservaId: null,
            createdAt: new Date('2025-10-01T10:00:00.000Z'),
            updateAt: new Date('2025-10-05T15:00:00.000Z'),
        };
        (prisma.venta.findUnique as jest.Mock).mockResolvedValue(mockVenta);

        // ACT
        const result = await getVentaById(1);

        // ASSERT
        expect(result).toEqual(mockVenta);
        expect(prisma.venta.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
            include: { comprador: true },
        });
    });

    test('debe lanzar un error 404 si la venta no existe', async () => {
        // ARRANGE
        (prisma.venta.findUnique as jest.Mock).mockResolvedValue(null);

        // ACT & ASSERT
        await expect(getVentaById(999)).rejects.toThrow('Venta no encontrada');
        await expect(getVentaById(999)).rejects.toHaveProperty('statusCode', 404);
    });
});

//--- Tests para createVenta ---
describe('createVenta', () => {
    test('debe crear y retornar una nueva venta exitosamente', async () => {

        const mockLote3: Lote = 
            {
                id: 3,
                estado: EstadoLote.DISPONIBLE,
                createdAt: new Date('2025-10-01T10:00:00.000Z'),
                updateAt: null,
                tipo: TipoLote.LOTE_VENTA,
                descripcion: null,
                subestado: SubestadoLote.NO_CONSTRUIDO,
                fondo: Decimal(30.4),
                frente: Decimal(60.6),
                numPartido: 68,
                superficie: Decimal(900.5),
                alquiler: false,
                deuda: false,
                precio: Decimal(50000),
                nombreEspacioComun: null,
                capacidad: null,
                fraccionId: 4,
                propietarioId: 1
            };
        // ARRANGE: Uso una petición que coincide con PostVentaRequest
        const newVentaRequest: PostVentaRequest = {
            id: 3,
            loteId: 3,
            lote: mockLote3,
            fechaVenta: '2025-12-01T18:00:00.000Z', // Las fechas en peticiones suelen ser strings ISO.
            monto: 120000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 15,
            inmobiliariaId: 2,
        };

        // Este es el objeto que esperamos que Prisma retorne.
        const createdVenta: Venta = {
            id: 3,
            loteId: newVentaRequest.loteId,
            fechaVenta: new Date(newVentaRequest.fechaVenta), // Prisma retorna un objeto Date.
            monto: Decimal(newVentaRequest.monto),
            estado: newVentaRequest.estado,
            plazoEscritura: null,
            tipoPago: newVentaRequest.tipoPago,
            compradorId: newVentaRequest.compradorId,
            inmobiliariaId: null,
            reservaId: null,
            createdAt: new Date(), // El valor exacto no importa, solo que sea un Date.
            updateAt: new Date(),
        };

    

        // Simulamos que el lote y el comprador existen.
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue({ id: 3 });
        (prisma.persona.findUnique as jest.Mock).mockResolvedValue({ id: 15 });
        (prisma.venta.create as jest.Mock).mockResolvedValue(createdVenta);
        
        // ACT
        const result = await createVenta(newVentaRequest);

        // ASSERT
        expect(result).toEqual(createdVenta);
        expect(prisma.lote.findUnique).toHaveBeenCalledWith({ where: { id: newVentaRequest.loteId } });
        expect(prisma.persona.findUnique).toHaveBeenCalledWith({ where: { id: newVentaRequest.compradorId } });
        expect(prisma.venta.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                loteId: 3,
                compradorId: 15,
                monto: 120000,
            })
        }));
    });

    test('debe lanzar un error 404 si el lote no existe', async () => {
        // ARRANGE
            const mockLote4: Lote = 
            {
                id: 999,
                estado: EstadoLote.DISPONIBLE,
                createdAt: new Date('2025-10-01T10:00:00.000Z'),
                updateAt: null,
                tipo: TipoLote.LOTE_VENTA,
                descripcion: null,
                subestado: SubestadoLote.NO_CONSTRUIDO,
                fondo: Decimal(30.4),
                frente: Decimal(60.6),
                numPartido: 68,
                superficie: Decimal(900.5),
                alquiler: false,
                deuda: false,
                precio: Decimal(50000),
                nombreEspacioComun: null,
                capacidad: null,
                fraccionId: 4,
                propietarioId: 1
            };

        const newVentaRequest: PostVentaRequest = { id: 999, lote: mockLote4, idLote: mockLote4.id, fraccion: mockLote4.fraccionId, loteId: 999, fechaVenta: '2025-10-17', monto: 1, tipoPago: 'CONTADO', compradorId: 1 };
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue(null); // El lote no existe

        // ACT & ASSERT
        await expect(createVenta(newVentaRequest)).rejects.toThrow('Lote no encontrado');
        await expect(createVenta(newVentaRequest)).rejects.toHaveProperty('statusCode', 404);
        expect(prisma.venta.create).not.toHaveBeenCalled();
    });

    test('debe lanzar un error 404 si el comprador no existe', async () => {
        // ARRANGE

        const mockLote6: Lote = 
            {
                id: 6,
                estado: EstadoLote.DISPONIBLE,
                createdAt: new Date('2025-10-01T10:00:00.000Z'),
                updateAt: null,
                tipo: TipoLote.LOTE_VENTA,
                descripcion: null,
                subestado: SubestadoLote.NO_CONSTRUIDO,
                fondo: Decimal(30.4),
                frente: Decimal(60.6),
                numPartido: 68,
                superficie: Decimal(900.5),
                alquiler: false,
                deuda: false,
                precio: Decimal(50000),
                nombreEspacioComun: null,
                capacidad: null,
                fraccionId: 4,
                propietarioId: 1
            };
        const newVentaRequest: PostVentaRequest = { id:1, lote: mockLote6, estado: EstadoVenta.INICIADA, loteId: 1, fechaVenta: '2025-10-17', monto: 1, tipoPago: 'CONTADO', compradorId: 999 };
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue({ id: 1 }); // El lote sí existe
        (prisma.persona.findUnique as jest.Mock).mockResolvedValue(null); // El comprador no

        // ACT & ASSERT
        await expect(createVenta(newVentaRequest)).rejects.toThrow('Comprador no encontrado');
        await expect(createVenta(newVentaRequest)).rejects.toHaveProperty('statusCode', 404);
        expect(prisma.venta.create).not.toHaveBeenCalled();
    });
});

//--- Tests para updateVenta ---
describe('updateVenta', () => {
    test('debe actualizar una venta exitosamente', async () => {
        // ARRANGE
        const updateData: PutVentaRequest = { id:1, updateAt: '2025-10-01T10:00:00.000Z', monto: 155000.75, estado: 'CON_BOLETO' };
        const updatedVenta = { 
            id: 1,
            monto: 155000.75,
            estado: 'CON_BOLETO',
        };
        (prisma.venta.update as jest.Mock).mockResolvedValue(updatedVenta);

        // ACT
        const result = await updateVenta(1, updateData);

        // ASSERT
        expect(result).toEqual(updatedVenta);
        expect(prisma.venta.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: updateData,
            include: { comprador: true },
        });
    });

    test('debe lanzar un error 404 si la venta a actualizar no existe', async () => {
        // ARRANGE
        const updateData: PutVentaRequest = { id: 1, updateAt: '2025-10-01T10:00:00.000Z',  monto: 100 };
        const prismaError = { code: 'P2025' }; // Error de Prisma para "registro no encontrado".
        (prisma.venta.update as jest.Mock).mockRejectedValue(prismaError);

        // ACT & ASSERT
        await expect(updateVenta(999, updateData)).rejects.toThrow('Venta no encontrada');
        await expect(updateVenta(999, updateData)).rejects.toHaveProperty('statusCode', 404);
    });
});

//--- Tests para deleteVenta ---
describe('deleteVenta', () => {
    test('debe eliminar una venta y retornar un mensaje de éxito', async () => {
        // ARRANGE
        (prisma.venta.delete as jest.Mock).mockResolvedValue({ id: 1 });

        // ACT
        const result = await deleteVenta(1);

        // ASSERT
        expect(result).toEqual({ message: 'Venta eliminada correctamente' });
        expect(prisma.venta.delete).toHaveBeenCalledWith({
            where: { id: 1 },
        });
    });

    test('debe lanzar un error 404 si la venta a eliminar no existe', async () => {
        // ARRANGE
        const prismaError = { code: 'P2025' };
        (prisma.venta.delete as jest.Mock).mockRejectedValue(prismaError);

        // ACT & ASSERT
        await expect(deleteVenta(999)).rejects.toThrow('Venta no encontrada');
        await expect(deleteVenta(999)).rejects.toHaveProperty('statusCode', 404);
    });
});