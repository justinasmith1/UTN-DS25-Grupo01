import { 
    createReservaSchema, 
    updateReservaSchema, 
    getReservaParamsSchema, 
    deleteReservaParamsSchema, 
    queryReservasSchema 
} from './reserva.validation';

//--- Tests para createReservaSchema ---
describe('createReservaSchema', () => {
    test('debe validar correctamente un objeto de reserva válido', () => {
        // ARRANGE
        const validReserva = {
            fechaReserva: '2025-12-01T18:00:00.000Z',
            loteId: 1,
            clienteId: 10,
            inmobiliariaId: 5,
            sena: 5000,
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(validReserva)).not.toThrow();
    });

    test('debe validar correctamente una reserva sin campos opcionales', () => {
        // ARRANGE
        const validReserva = {
            fechaReserva: '2025-12-01T18:00:00.000Z',
            loteId: 1,
            clienteId: 10,
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(validReserva)).not.toThrow();
    });

    test('debe rechazar un objeto sin campos obligatorios', () => {
        // ARRANGE
        const invalidReserva = {
            loteId: 1,
            clienteId: 10,
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(invalidReserva)).toThrow();
    });

    test('debe rechazar un loteId negativo', () => {
        // ARRANGE
        const invalidReserva = {
            fechaReserva: '2025-12-01T18:00:00.000Z',
            loteId: -1,
            clienteId: 10,
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(invalidReserva)).toThrow();
    });

    test('debe rechazar una fecha inválida', () => {
        // ARRANGE
        const invalidReserva = {
            fechaReserva: 'fecha-invalida',
            loteId: 1,
            clienteId: 10,
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(invalidReserva)).toThrow();
    });

    test('debe rechazar una seña negativa', () => {
        // ARRANGE
        const invalidReserva = {
            fechaReserva: '2025-12-01T18:00:00.000Z',
            loteId: 1,
            clienteId: 10,
            sena: -1000,
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(invalidReserva)).toThrow();
    });

    test('debe rechazar campos adicionales no permitidos', () => {
        // ARRANGE
        const invalidReserva = {
            fechaReserva: '2025-12-01T18:00:00.000Z',
            loteId: 1,
            clienteId: 10,
            campoExtra: 'no permitido',
        };

        // ACT & ASSERT
        expect(() => createReservaSchema.parse(invalidReserva)).toThrow();
    });
});

//--- Tests para updateReservaSchema ---
describe('updateReservaSchema', () => {
    test('debe validar correctamente una actualización parcial', () => {
        // ARRANGE
        const updateData = {
            sena: 10000,
        };

        // ACT & ASSERT
        expect(() => updateReservaSchema.parse(updateData)).not.toThrow();
    });

    test('debe rechazar un objeto vacío', () => {
        // ARRANGE
        const emptyUpdate = {};

        // ACT & ASSERT
        expect(() => updateReservaSchema.parse(emptyUpdate)).toThrow('Debes enviar al menos un campo para actualizar');
    });

    test('debe validar correctamente múltiples campos', () => {
        // ARRANGE
        const updateData = {
            fechaReserva: '2025-12-15T18:00:00.000Z',
            sena: 15000,
        };

        // ACT & ASSERT
        expect(() => updateReservaSchema.parse(updateData)).not.toThrow();
    });
});

//--- Tests para getReservaParamsSchema ---
describe('getReservaParamsSchema', () => {
    test('debe validar correctamente un ID válido', () => {
        // ARRANGE
        const validParams = { id: 1 };

        // ACT & ASSERT
        expect(() => getReservaParamsSchema.parse(validParams)).not.toThrow();
    });

    test('debe rechazar un ID negativo', () => {
        // ARRANGE
        const invalidParams = { id: -1 };

        // ACT & ASSERT
        expect(() => getReservaParamsSchema.parse(invalidParams)).toThrow();
    });

    test('debe rechazar un ID no entero', () => {
        // ARRANGE
        const invalidParams = { id: 1.5 };

        // ACT & ASSERT
        expect(() => getReservaParamsSchema.parse(invalidParams)).toThrow();
    });

    test('debe convertir string a número correctamente', () => {
        // ARRANGE
        const validParams = { id: '5' };

        // ACT & ASSERT
        expect(() => getReservaParamsSchema.parse(validParams)).not.toThrow();
    });
});

//--- Tests para deleteReservaParamsSchema ---
describe('deleteReservaParamsSchema', () => {
    test('debe validar correctamente un ID válido para eliminar', () => {
        // ARRANGE
        const validParams = { id: 1 };

        // ACT & ASSERT
        expect(() => deleteReservaParamsSchema.parse(validParams)).not.toThrow();
    });

    test('debe rechazar un ID inválido para eliminar', () => {
        // ARRANGE
        const invalidParams = { id: 0 };

        // ACT & ASSERT
        expect(() => deleteReservaParamsSchema.parse(invalidParams)).toThrow();
    });
});

//--- Tests para queryReservasSchema ---
describe('queryReservasSchema', () => {
    test('debe validar correctamente una query sin filtros', () => {
        // ARRANGE
        const emptyQuery = {};

        // ACT & ASSERT
        expect(() => queryReservasSchema.parse(emptyQuery)).not.toThrow();
    });

    test('debe validar correctamente una query con filtros válidos', () => {
        // ARRANGE
        const validQuery = {
            desde: '2025-01-01T00:00:00.000Z',
            hasta: '2025-12-31T23:59:59.000Z',
            loteId: 1,
            clienteId: 10,
            inmobiliariaId: 5,
            sena: 5000,
        };

        // ACT & ASSERT
        expect(() => queryReservasSchema.parse(validQuery)).not.toThrow();
    });

    test('debe rechazar fechas inválidas', () => {
        // ARRANGE
        const invalidQuery = {
            desde: 'fecha-invalida',
            hasta: '2025-12-31T23:59:59.000Z',
        };

        // ACT & ASSERT
        expect(() => queryReservasSchema.parse(invalidQuery)).toThrow();
    });

    test('debe rechazar un rango de fechas inválido (desde > hasta)', () => {
        // ARRANGE
        const invalidQuery = {
            desde: '2025-12-31T23:59:59.000Z',
            hasta: '2025-01-01T00:00:00.000Z',
        };

        // ACT & ASSERT
        expect(() => queryReservasSchema.parse(invalidQuery)).toThrow('El rango de fechas es inválido (desde > hasta)');
    });

    test('debe rechazar una seña negativa en la query', () => {
        // ARRANGE
        const invalidQuery = {
            sena: -1000,
        };

        // ACT & ASSERT
        expect(() => queryReservasSchema.parse(invalidQuery)).toThrow();
    });
});
