import { 
    createVentaSchema, 
    updateVentaSchema, 
    getVentaSchema, 
    deleteVentaSchema, 
    queryVentaSchema 
} from './venta.validation';

//--- Tests para createVentaSchema ---
describe('createVentaSchema', () => {
    test('debe validar correctamente una venta válida', () => {
        // ARRANGE
        const validVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 10,
            inmobiliariaId: 5,
            reservaId: 1,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(validVenta)).not.toThrow();
    });

    test('debe validar correctamente una venta sin campos opcionales', () => {
        // ARRANGE
        const validVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 10,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(validVenta)).not.toThrow();
    });

    test('debe rechazar un loteId negativo', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: -1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 10,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe rechazar una fecha inválida', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: 1,
            fechaVenta: 'fecha-invalida',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 10,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe rechazar un monto negativo', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: -1000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 10,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe rechazar un estado inválido', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'ESTADO_INVALIDO',
            tipoPago: 'CONTADO',
            compradorId: 10,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe rechazar un tipoPago vacío', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: '',
            compradorId: 10,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe rechazar un compradorId negativo', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: -1,
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe rechazar una fecha de plazo de escritura inválida', () => {
        // ARRANGE
        const invalidVenta = {
            loteId: 1,
            fechaVenta: '2025-12-01T18:00:00.000Z',
            monto: 100000,
            estado: 'INICIADA',
            tipoPago: 'CONTADO',
            compradorId: 10,
            plazoEscritura: 'fecha-invalida',
        };

        // ACT & ASSERT
        expect(() => createVentaSchema.parse(invalidVenta)).toThrow();
    });

    test('debe validar todos los estados válidos', () => {
        // ARRANGE
        const estados = ['INICIADA', 'CON_BOLETO', 'ESCRITURADO', 'CANCELADA'];

        // ACT & ASSERT
        estados.forEach(estado => {
            // Agregar campos obligatorios según el estado
            const validVenta: any = {
                loteId: 1,
                fechaVenta: '2025-12-01T18:00:00.000Z',
                monto: 100000,
                estado,
                tipoPago: 'CONTADO',
                compradorId: 10,
                numero: 'VENTA-001',
            };
            
            // Agregar campos obligatorios según estado
            if (estado === 'ESCRITURADO') {
                validVenta.fechaEscrituraReal = '2025-12-15T18:00:00.000Z';
            }
            if (estado === 'CANCELADA') {
                validVenta.fechaCancelacion = '2025-12-15T18:00:00.000Z';
                validVenta.motivoCancelacion = 'Cliente desistió';
            }
            
            expect(() => createVentaSchema.parse(validVenta)).not.toThrow();
        });
    });
});

//--- Tests para updateVentaSchema ---
describe('updateVentaSchema', () => {
    test('debe validar correctamente una actualización parcial', () => {
        // ARRANGE
        const updateData = {
            monto: 150000,
        };

        // ACT & ASSERT
        expect(() => updateVentaSchema.parse(updateData)).not.toThrow();
    });

    test('debe validar correctamente múltiples campos', () => {
        // ARRANGE
        const updateData = {
            monto: 150000,
            estado: 'CON_BOLETO',
        };

        // ACT & ASSERT
        expect(() => updateVentaSchema.parse(updateData)).not.toThrow();
    });

    test('debe rechazar un monto negativo en actualización', () => {
        // ARRANGE
        const invalidUpdate = {
            monto: -1000,
        };

        // ACT & ASSERT
        expect(() => updateVentaSchema.parse(invalidUpdate)).toThrow();
    });
});

//--- Tests para getVentaSchema ---
describe('getVentaSchema', () => {
    test('debe validar correctamente un ID válido', () => {
        // ARRANGE
        const validParams = { id: 1 };

        // ACT & ASSERT
        expect(() => getVentaSchema.parse(validParams)).not.toThrow();
    });

    test('debe rechazar un ID negativo', () => {
        // ARRANGE
        const invalidParams = { id: -1 };

        // ACT & ASSERT
        expect(() => getVentaSchema.parse(invalidParams)).toThrow();
    });

    test('debe rechazar un ID no entero', () => {
        // ARRANGE
        const invalidParams = { id: 1.5 };

        // ACT & ASSERT
        expect(() => getVentaSchema.parse(invalidParams)).toThrow();
    });

    test('debe convertir string a número correctamente', () => {
        // ARRANGE
        const validParams = { id: '5' };

        // ACT & ASSERT
        expect(() => getVentaSchema.parse(validParams)).not.toThrow();
    });
});

//--- Tests para deleteVentaSchema ---
describe('deleteVentaSchema', () => {
    test('debe validar correctamente un ID válido para eliminar', () => {
        // ARRANGE
        const validParams = { id: 1 };

        // ACT & ASSERT
        expect(() => deleteVentaSchema.parse(validParams)).not.toThrow();
    });

    test('debe rechazar un ID inválido para eliminar', () => {
        // ARRANGE
        const invalidParams = { id: 0 };

        // ACT & ASSERT
        expect(() => deleteVentaSchema.parse(invalidParams)).toThrow();
    });
});

//--- Tests para queryVentaSchema ---
describe('queryVentaSchema', () => {
    test('debe validar correctamente una query sin filtros', () => {
        // ARRANGE
        const emptyQuery = {};

        // ACT & ASSERT
        expect(() => queryVentaSchema.parse(emptyQuery)).not.toThrow();
    });

    test('debe validar correctamente una query con filtros válidos', () => {
        // ARRANGE
        const validQuery = {
            estado: 'INICIADA',
            compradorId: 10,
            vendedorId: 5,
            loteId: 1,
            fechaVentaFrom: '2025-01-01T00:00:00.000Z',
            fechaVentaTo: '2025-12-31T23:59:59.000Z',
            montoMin: 50000,
            montoMax: 200000,
        };

        // ACT & ASSERT
        expect(() => queryVentaSchema.parse(validQuery)).not.toThrow();
    });

    test('debe rechazar un estado inválido en la query', () => {
        // ARRANGE
        const invalidQuery = {
            estado: 'ESTADO_INVALIDO',
        };

        // ACT & ASSERT
        expect(() => queryVentaSchema.parse(invalidQuery)).toThrow();
    });

    test('debe rechazar un compradorId negativo en la query', () => {
        // ARRANGE
        const invalidQuery = {
            compradorId: -1,
        };

        // ACT & ASSERT
        expect(() => queryVentaSchema.parse(invalidQuery)).toThrow();
    });

    test('debe rechazar fechas inválidas en la query', () => {
        // ARRANGE
        const invalidQuery = {
            fechaVentaFrom: 'fecha-invalida',
            fechaVentaTo: '2025-12-31T23:59:59.000Z',
        };

        // ACT & ASSERT
        expect(() => queryVentaSchema.parse(invalidQuery)).toThrow();
    });

    test('debe rechazar montos negativos en la query', () => {
        // ARRANGE
        const invalidQuery = {
            montoMin: -1000,
            montoMax: 200000,
        };

        // ACT & ASSERT
        expect(() => queryVentaSchema.parse(invalidQuery)).toThrow();
    });

    test('debe validar todos los estados válidos en la query', () => {
        // ARRANGE
        const estados = ['INICIADA', 'CON_BOLETO', 'ESCRITURADO', 'CANCELADA'];

        // ACT & ASSERT
        estados.forEach(estado => {
            const validQuery = { estado };
            expect(() => queryVentaSchema.parse(validQuery)).not.toThrow();
        });
    });
});
