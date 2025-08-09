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

// ==============================
// Datos en memoria (mock)
// ==============================
// Estos comentarios aplican tambien para el resto de los services
// Por ahora las Inmobiliarias estan almacenadas en un array en memoria, ya que todavia no usamos una BD.
// Los datos se cargan manualmente para pruebas y desarrollo.

let inmobiliarias: Inmobiliaria[] = [
    {
        idInmobiliaria: 1,
        nombre: "Andinolfi Inmobiliaria",
        telefono: "2227-546076",
        email: "camilo@andinolfi.com"
    },
    {
        idInmobiliaria: 2,
        nombre: "NS Inmobiliaria",
        telefono: "+54 9 2227 50-4344",
        email: "contacto@nsInmobiliaria.com.ar"
    },
    {
        idInmobiliaria: 3,
        nombre: "Andrea Gianfelice Inmobiliaria",
        telefono: "(02227) 432429",
        email: "info@agianfeliceprop.com"
    },
    {
        idInmobiliaria: 4,
        nombre: "Azcarate Propiedades",
        telefono: "02227 15555332",
        email: "Azcaratepropiedades.com.ar"
    }
]

// ==============================
// Obtener todas las Inmobiliarias
// ==============================
// Retorna el listado completo de Inmobiliarias junto con el total.
// Esto nos va a ser util para mostrar en listados o paneles administrativos (mostrar el dashboard).
export async function getAllInmobiliarias(): Promise<GetInmobiliariasResponse> {
    return { inmobiliarias, total: inmobiliarias.length };
}

// ==============================
// Obtener una Inmobiliaria por ID
// ==============================
// Busca dentro del array la Inmobiliaria cuyo ID coincida con el solicitado.
// Si no existe, devuelve un mensaje de error.
export async function getInmobiliariaById(request: GetInmobiliariaRequest): Promise<GetInmobiliariaResponse> {
    const inmobiliaria = inmobiliarias.find(r => r.idInmobiliaria === request.idInmobiliaria) || null;
    if (!inmobiliaria) {
        return { inmobiliaria: null, message: 'Inmobiliaria no encontrada' };
    }
    return {inmobiliaria};
}

// ==============================
// Crear nueva Inmobiliaria
// ==============================
// Agrega una nueva Inmobiliaria al array en memoria.
// Se hace una validacion para evitar duplicados de lote + cliente en la misma fecha.
// Los datos del cliente, lote e Inmobiliaria se simplifican para esta etapa de desarrollo.
export async function createInmobiliaria(data: PostInmobiliariaRequest): Promise<PostInmobiliariaResponse> {
    if (inmobiliarias.some(i => i.nombre === data.nombre)) {
        return { inmobiliaria: null, message: 'El nombre ya existe' };
    }

    const nuevaInmobiliaria: Inmobiliaria = {
        idInmobiliaria: inmobiliarias.length ? Math.max(...inmobiliarias.map(i => i.idInmobiliaria)) + 1 : 1,
        ...data
    };

    inmobiliarias.push(nuevaInmobiliaria);
    return { inmobiliaria: nuevaInmobiliaria, message: 'Inmobiliaria creado exitosamente' };
}
// ==============================
// Actualizar Inmobiliaria existente
// ==============================
// Busca la Inmobiliaria por ID y, si existe, reemplaza sus datos con los nuevos recibidos.
// Devuelve mensaje segun resultado.
export async function updateInmobiliaria(idInmobiliaria: number, data: PutInmobiliariaRequest): Promise<PutInmobiliariaResponse> {
    const index = inmobiliarias.findIndex(i => i.idInmobiliaria === idInmobiliaria);
    if (index === -1) {
        return { message: 'Inmobiliaria no encontrada' };
    }
    inmobiliarias[index] = { ...inmobiliarias[index], ...data };
    return { message: 'Inmobiliaria actualizada exitosamente' };
}

// ==============================
// Eliminar Inmobiliaria
// ==============================
// Elimina del array la Inmobiliaria que coincida con el ID especificado.
// Devuelve mensaje segun exito o error.
export async function deleteInmobiliaria(idInmobiliaria: number): Promise<DeleteInmobiliariaResponse> {
    const index = inmobiliarias.findIndex(i => i.idInmobiliaria === idInmobiliaria);
    if (index === -1) {
        return { message: 'Inmobiliaria no encontrada' };
    }
    inmobiliarias.splice(index, 1);
    return { message: 'Inmobiliaria eliminada exitosamente' };
}