import { Venta, GetVentasResponse, GetVentaRequest, GetVentaResponse, PostVentaRequest, PostVentaResponse, PutVentaRequest, PutVentaResponse
, DeleteVentaRequest, DeleteVentaResponse, Persona } from '../types/interfacesCCLF'; 

let ventas: Venta[] = [
    {
        idVenta: 1,
        idLote: 2,
        montoTotal: 65000,
        comprador: { idPersona: 101, nombre: "Juan Pérez" } as Persona,
        fechaVenta: "2023-10-15"
    },
    {
        idVenta: 2,
        idLote: 3,
        montoTotal: 58000,
        comprador: { idPersona: 102, nombre: "Ana Gómez" } as Persona,
        fechaVenta: "2023-11-20"
    }
];

export async function getAllVentas(): Promise<GetVentasResponse> {
    return { ventas, total: ventas.length };
}

export async function getVentaById(idVenta: number): Promise<GetVentaResponse> {
    const venta = ventas.find(v => v.idVenta === idVenta) || null;
    if (!venta) {
        return { venta: null, message: 'Venta no encontrada' };
    }
    return { venta };
}

export async function createVenta(data: PostVentaRequest): Promise<PostVentaResponse> {
    const nuevoId = Math.max(...ventas.map(v => v.idVenta)) + 1;
    const nuevaVenta: Venta = { idVenta: nuevoId, ...data, comprador: { idPersona: data.idComprador } as Persona }; // Asignar solo el ID del comprador, se tendria que buscar el nombre asoaciado una vez que tens personas.
    ventas.push(nuevaVenta);
    return { venta: nuevaVenta, message: 'Venta creada exitosamente' };
}

export async function updateVenta(idVenta: number, data: PutVentaRequest): Promise<PutVentaResponse> {
    const index = ventas.findIndex(v => v.idVenta === idVenta);
    if (index === -1) {
        return { message: 'Venta no encontrada' };
    }
    ventas[index] = { ...ventas[index], ...data };
    return { message: 'Venta actualizada exitosamente' };
}

export async function deleteVenta(idVenta: number): Promise<DeleteVentaResponse> {
    const index = ventas.findIndex(v => v.idVenta === idVenta);
    if (index === -1) {
        return { message: 'Venta no encontrada' };
    }
    ventas.splice(index, 1);
    return { message: 'Venta eliminada exitosamente' };
}

