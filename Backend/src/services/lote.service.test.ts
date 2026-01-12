import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/prisma';
import { getAllLotes, getLoteById, createLote, updatedLote, deleteLote } from './lote.service';
import { EstadoLote, SubestadoLote, TipoLote } from '../generated/prisma';

// ARRANGE GLOBAL: mock de Prisma alineado al estilo de los demás tests
jest.mock('../config/prisma', () => ({
    lote: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    ubicacion: {
        update: jest.fn(),
        create: jest.fn(),
    },
    archivos: {
        deleteMany: jest.fn(),
    },
    reserva: {
        deleteMany: jest.fn(),
    },
    venta: {
        deleteMany: jest.fn(),
    },
}));


const createMockLote = (overrides: Partial<any> = {}) => ({
    id: 1,
    tipo: TipoLote.LOTE_VENTA,
    descripcion: 'Lote esquinero con servicios',
    estado: EstadoLote.DISPONIBLE,
    subestado: SubestadoLote.EN_CONSTRUCCION,
    fondo: Decimal(35.5),
    frente: Decimal(20.75),
    numPartido: 62,
    superficie: Decimal(480.33),
    alquiler: false,
    deuda: false,
    precio: Decimal(125000.5),
    nombreEspacioComun: null,
    capacidad: null,
    fraccionId: 3,
    propietarioId: 7,
    ubicacionId: 5,
    createdAt: new Date('2025-10-01T10:00:00.000Z'),
    updateAt: new Date('2025-10-05T12:00:00.000Z'),
    Venta: [{ id: 11 }],
    reserva: [{ id: 21 }],
    archivos: [],
    ...overrides,
});

// ARRANGE GLOBAL: limpiar mocks
afterEach(() => {
    jest.clearAllMocks();
});

// --- Tests para getAllLotes ---
describe('getAllLotes', () => {
    test('debe devolver la lista de lotes y el total', async () => {
        // ARRANGE
        const mockLotes = [
            createMockLote(),
            createMockLote({ id: 2, estado: EstadoLote.RESERVADO, deuda: true }),
        ];
        (prisma.lote.findMany as jest.Mock).mockResolvedValue(mockLotes);
        (prisma.lote.count as jest.Mock).mockResolvedValue(mockLotes.length);

        // ACT
        const result = await getAllLotes();

        // ASSERT
        expect(result).toEqual({ lotes: mockLotes, total: mockLotes.length });
        expect(prisma.lote.findMany).toHaveBeenCalledWith({
            where: {},
            orderBy: { id: 'asc' },
        });
        expect(prisma.lote.count).toHaveBeenCalledWith({ where: {} });
    });

    test('debe ocultar deuda, ventas y reservas para técnicos', async () => {
        // ARRANGE
        const mockLotes = [
            createMockLote(),
            createMockLote({ id: 2, deuda: true, Venta: [{ id: 99 }], reserva: [] }),
        ];
        (prisma.lote.findMany as jest.Mock).mockResolvedValue(mockLotes);
        (prisma.lote.count as jest.Mock).mockResolvedValue(mockLotes.length);

        // ACT
        const { lotes } = await getAllLotes({}, 'TECNICO');

        // ASSERT
        lotes.forEach((lote: any) => {
            expect(lote).not.toHaveProperty('deuda');
            expect(lote).not.toHaveProperty('Venta');
            expect(lote).not.toHaveProperty('reserva');
        });
    });
});

// --- Tests para getLoteById ---
describe('getLoteById', () => {
    test('debe devolver un lote existente', async () => {
        // ARRANGE
        const mockLote = createMockLote();
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue(mockLote);

        // ACT
        const result = await getLoteById(1);

        // ASSERT
        expect(result).toEqual(mockLote);
        expect(prisma.lote.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    test('debe ocultar datos sensibles para técnicos', async () => {
        // ARRANGE
        const mockLote = createMockLote();
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue(mockLote);

        // ACT
        const result = await getLoteById(1, 'TECNICO');

        // ASSERT
        expect(result).not.toHaveProperty('deuda');
        expect(result).not.toHaveProperty('Venta');
        expect(result).not.toHaveProperty('reserva');
    });

    test('debe lanzar error 404 si no existe el lote', async () => {
        // ARRANGE
        (prisma.lote.findUnique as jest.Mock).mockResolvedValue(null);

        // ACT & ASSERT
        await expect(getLoteById(999)).rejects.toThrow('Lote no encontrado');
        await expect(getLoteById(999)).rejects.toHaveProperty('statusCode', 404);
    });
});

// --- Tests para createLote ---
describe('createLote', () => {
    test('debe crear un lote correctamente', async () => {
        // ARRANGE
        const mockLoteRequest = {
            tipo: 'Lote Venta',
            estado: 'Disponible',
            subestado: 'En Construccion',
            descripcion: 'Nuevo lote',
            frente: 15.75,
            fondo: 35.5,
            superficie: 480.33,
            precio: 125000.5,
            numPartido: 62,
            alquiler: false,
            deuda: false,
            nombreEspacioComun: null,
            capacidad: null,
            fraccionId: 3,
            propietarioId: 7,
            ubicacionId: 5,
        };
        const mockCreated = createMockLote();
        (prisma.lote.create as jest.Mock).mockResolvedValue(mockCreated);

        // ACT
        const result = await createLote(mockLoteRequest);

        // ASSERT
        expect(result).toEqual(mockCreated);
        expect(prisma.lote.create).toHaveBeenCalledWith({
            data: {
                tipo: 'LOTE_VENTA',
                estado: 'DISPONIBLE',
                subestado: 'EN_CONSTRUCCION',
                descripcion: mockLoteRequest.descripcion,
                frente: mockLoteRequest.frente,
                fondo: mockLoteRequest.fondo,
                superficie: mockLoteRequest.superficie,
                precio: mockLoteRequest.precio,
                numPartido: mockLoteRequest.numPartido,
                alquiler: mockLoteRequest.alquiler,
                deuda: mockLoteRequest.deuda,
                nombreEspacioComun: mockLoteRequest.nombreEspacioComun,
                capacidad: mockLoteRequest.capacidad,
                fraccion: { connect: { id: mockLoteRequest.fraccionId } },
                propietario: { connect: { id: mockLoteRequest.propietarioId } },
                ubicacion: { connect: { id: mockLoteRequest.ubicacionId } },
            },
        });
    });

    test('debe exigir precio para lote de venta', async () => {
        // ARRANGE
        const mockLoteRequest = {
            tipo: 'Lote Venta',
            estado: 'Disponible',
            subestado: 'En Construccion',
            fraccionId: 3,
            propietarioId: 7,
        };

        // ACT & ASSERT
        await expect(createLote(mockLoteRequest)).rejects.toThrow('El precio es obligatorio para "Lote Venta"');
        expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    test('no debe permitir precio para espacio común', async () => {
        // ARRANGE
        const mockLoteRequest = {
            tipo: 'Espacio Comun',
            estado: 'Disponible',
            subestado: 'En Construccion',
            fraccionId: 3,
            propietarioId: 7,
            precio: 5000,
        };

        // ACT & ASSERT
        await expect(createLote(mockLoteRequest)).rejects.toThrow('El precio no aplica para "Espacio Comun"');
        expect(prisma.lote.create).not.toHaveBeenCalled();
    });
});

// --- Tests para updatedLote ---
describe('updatedLote', () => {
    test('debe actualizar un lote', async () => {
        // ARRANGE
        const updateData = { descripcion: 'Actualizado', superficie: 500 };
        const updated = createMockLote({ descripcion: 'Actualizado', superficie: Decimal(500) });
        (prisma.lote.update as jest.Mock).mockResolvedValue(updated);

        // ACT
        const result = await updatedLote(1, updateData);

        // ASSERT
        expect(result).toEqual(updated);
        expect(prisma.lote.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: updateData,
        });
    });

    test('debe permitir a técnicos modificar subestado, frente, fondo y superficie', async () => {
        // ARRANGE
        const updateData = { subestado: 'Construido', frente: 18, fondo: 40, superficie: 520, descripcion: 'No debería actualizarse' };
        const updated = createMockLote({ subestado: SubestadoLote.CONSTRUIDO, frente: Decimal(18), fondo: Decimal(40), superficie: Decimal(520) });
        (prisma.lote.update as jest.Mock).mockResolvedValue(updated);

        // ACT
        await updatedLote(1, updateData, 'TECNICO');

        // ASSERT
        expect(prisma.lote.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: {
                subestado: 'CONSTRUIDO',
                frente: 18,
                fondo: 40,
                superficie: 520,
            },
        });
    });

    test('debe permitir a técnicos gestionar archivos de planos', async () => {
        // ARRANGE
        const updateData = { archivos: { create: [{ nombreArchivo: 'plano.pdf', tipo: 'PLANO' }] } };
        const updated = createMockLote();
        (prisma.lote.update as jest.Mock).mockResolvedValue(updated);

        // ACT
        await updatedLote(1, updateData, 'TECNICO');

        // ASSERT
        expect(prisma.lote.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: {
                archivos: { create: [{ nombreArchivo: 'plano.pdf', tipo: 'PLANO' }] },
            },
        });
    });

    test('debe rechazar cuando el técnico no envía campos permitidos', async () => {
        // ARRANGE
        const updateData = { precio: 200000 };

        // ACT & ASSERT
        await expect(updatedLote(1, updateData, 'TECNICO')).rejects.toThrow('Como TECNICO, solo puedes modificar los campos: subestado, frente, fondo, superficie y archivos (planos)');
        await expect(updatedLote(1, updateData, 'TECNICO')).rejects.toHaveProperty('statusCode', 403);
        expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    test('debe lanzar 404 cuando Prisma informa registro inexistente', async () => {
        // ARRANGE
        const prismaError = { code: 'P2025' };
        (prisma.lote.update as jest.Mock).mockRejectedValue(prismaError);

        // ACT & ASSERT
        await expect(updatedLote(999, {})).rejects.toThrow('Lote no encontrado');
    });
});

// --- Tests para deleteLote ---
describe('deleteLote', () => {
    test('debe eliminar un lote para roles autorizados', async () => {
        // ARRANGE
        (prisma.lote.delete as jest.Mock).mockResolvedValue({ id: 1 });

        // ACT
        const result = await deleteLote(1);

        // ASSERT
        expect(result).toEqual({ message: 'Lote eliminado correctamente' });
        expect(prisma.lote.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    test('debe rechazar la eliminación cuando el rol es técnico', async () => {
        // ARRANGE
        // (no hay llamadas a prisma.lote.delete cuando es técnico)

        // ACT & ASSERT
        await expect(deleteLote(1, 'TECNICO')).rejects.toThrow('Los técnicos no están autorizados para eliminar lotes');
        await expect(deleteLote(1, 'TECNICO')).rejects.toHaveProperty('statusCode', 403);
        expect(prisma.lote.delete).not.toHaveBeenCalled();
        expect(prisma.lote.deleteMany).not.toHaveBeenCalled();
    });
});
