import { 
    Reserva,
    GetReservasResponse,
    GetReservaRequest,
    GetReservaResponse,
    PostReservaRequest,
    PostReservaResponse,
    PutReservaRequest,
    PutReservaResponse,
    DeleteReservaResponse,
    EstadoLote,
    SubestadoLote,
    Ubicacion,
    Persona,
    Inmobiliaria,
    LoteVenta
} from '../types/interfacesCCLF';

// ==============================
// Datos en memoria (mock)
// ==============================
// Estos comentarios aplican tambien para el resto de los services
// Por ahora las reservas estan almacenadas en un array en memoria, ya que todavia no usamos una BD.
// Los datos se cargan manualmente para pruebas y desarrollo.
let reservas: Reserva[] = [
    {
        idReserva: 1,
        lote: { idLote: 1 } as LoteVenta , // Simplificado
        cliente: { nombre: "Juan Pérez" } as Persona, // Tambien simplificado
        fechaReserva: "2025-08-10",
        seña: 50000,
        inmobiliaria: { nombre: "Inmobiliaria Andina" } as Inmobiliaria
    },
    {
        idReserva: 2,
        lote: { idLote: 2 } as LoteVenta, 
        cliente: { nombre: "María Gómez" } as Persona,
        fechaReserva: "2025-08-11",
        seña: 60000,
        inmobiliaria: { nombre: "Inmobiliaria Río" } as Inmobiliaria // Revisar cuando este implementado el modulo inmobiliarias
    },
    {
        idReserva: 3,
        lote: { idLote: 3 } as LoteVenta,
        cliente: { nombre: "Elver Galan" } as Persona,
        fechaReserva: "2025-08-11",
        seña: 50000,
        inmobiliaria: { nombre: "Inmobiliaria Río" } as Inmobiliaria
    },
    {
        idReserva: 4,
        lote: { idLote: 9 } as LoteVenta,
        cliente: { nombre: "Javo Enciso Gifted" } as Persona,
        fechaReserva: "2025-08-12",
        seña: 50000,
        inmobiliaria: { nombre: "Inmobiliaria Andina" } as Inmobiliaria
    },
    {
        idReserva: 5,
        lote: { idLote: 7 } as LoteVenta,
        cliente: { nombre: "Juan Wanso Tarrio" } as Persona,
        fechaReserva: "2025-08-22",
        seña: 40000,
        inmobiliaria: { nombre: "Inmobiliaria Río" } as Inmobiliaria
    }
];

// ==============================
// Obtener todas las reservas
// ==============================
// Retorna el listado completo de reservas junto con el total.
// Esto nos va a ser util para mostrar en listados o paneles administrativos (mostrar el dashboard).
export async function getAllReservas(): Promise<GetReservasResponse> {
    return { reservas, total: reservas.length };
}

// ==============================
// Obtener una reserva por ID
// ==============================
// Busca dentro del array la reserva cuyo ID coincida con el solicitado.
// Si no existe, devuelve un mensaje de error.
export async function getReservaById(request: GetReservaRequest): Promise<GetReservaResponse> {
    const reserva = reservas.find(r => r.idReserva === request.idReserva) || null;
    if (!reserva) {
        return { reserva: null, message: 'Reserva no encontrada' };
    }
    return { reserva };
}

// ==============================
// Crear nueva reserva
// ==============================
// Agrega una nueva reserva al array en memoria.
// Se hace una validacion para evitar duplicados de lote + cliente en la misma fecha.
// Los datos del cliente, lote e inmobiliaria se simplifican para esta etapa de desarrollo.
export async function createReserva(data: PostReservaRequest): Promise<PostReservaResponse> {
    // Validacion para evitar duplicados
    if (reservas.some(r =>
        r.lote.idLote === data.idLote &&
        r.cliente.idPersona === data.idCliente &&
        r.fechaReserva === data.fechaReserva
    )) {
        return { reserva: null, message: 'Ya existe una reserva para este cliente y lote en esa fecha' };
    }

    // Creacion del objeto Reserva simplificado
    const nuevaReserva: Reserva = {
        idReserva: reservas.length ? Math.max(...reservas.map(r => r.idReserva)) + 1 : 1,
        lote: { idLote: data.idLote, nombre: `Lote ${data.idLote}` } as any,
        cliente: { idPersona: data.idCliente, nombre: `Cliente ${data.idCliente}` } as any,
        fechaReserva: data.fechaReserva,
        seña: data.seña,
        inmobiliaria: data.idInmobiliaria
            ? { idInmobiliaria: data.idInmobiliaria, nombre: `Inmobiliaria ${data.idInmobiliaria}` } as any
            : undefined
    };

    // Guardar en el array
    reservas.push(nuevaReserva);
    return { reserva: nuevaReserva, message: 'Reserva creada exitosamente' };
}

// ==============================
// Actualizar reserva existente
// ==============================
// Busca la reserva por ID y, si existe, reemplaza sus datos con los nuevos recibidos.
// Devuelve mensaje segun resultado.
export async function updateReserva(idReserva: number, data: PutReservaRequest): Promise<PutReservaResponse> {
    const index = reservas.findIndex(r => r.idReserva === idReserva);
    if (index === -1) {
        return { message: 'Reserva no encontrada' };
    }
    reservas[index] = { ...reservas[index], ...data };
    return { message: 'Reserva actualizada exitosamente' };
}

// ==============================
// Eliminar reserva
// ==============================
// Elimina del array la reserva que coincida con el ID especificado.
// Devuelve mensaje segun exito o error.
export async function deleteReserva(idReserva: number): Promise<DeleteReservaResponse> {
    const index = reservas.findIndex(r => r.idReserva === idReserva);
    if (index === -1) {
        return { message: 'Reserva no encontrada' };
    }
    reservas.splice(index, 1);
    return { message: 'Reserva eliminada exitosamente' };
}
