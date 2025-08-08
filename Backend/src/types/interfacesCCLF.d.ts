// interfacesCCLF.d.ts

// --- TIPOS BÁSICOS ---
// Estos tipos definen los valores permitidos para ciertas propiedades,
// lo que ayuda a prevenir errores de tipeo.

export type Identificador = "DNI" | "CUIT" | "CUIL" | "Pasaporte";
export type Calle = "Reinamora" | "Maca" | "Zorzal" | "Cauquén" | "Alondra" | "Jacana" | "Tacuarito" | "Jilguero" | "Golondrina" | "Calandria" | "Aguilamora" | "Lorca" | "Milano";
export type EstadoLote = "Disponible" | "Reservado" | "Vendido" | "No Disponible" | "Alquilado" | "En Promoción";
export type SubestadoLote = "En Construccion" | "No Construido" | "Construido";
export type Ubicacion = "Norte" | "Sur" | "Este" | "Oeste";


// --- INTERFACES DE DATOS (ESTRUCTURAS) ---
// Estas interfaces son los "planos" que definen cómo deben ser los objetos en la aplicación.

export interface Persona {
    idPersona: number;
    nombre: string;
    apellido: string;
    identificador: Identificador;
    telefono?: number;
    email?: string;
}

export interface Lote {
    idLote: number;
    fraccion: number;
    readonly numPartido: 62;
    numero?: number;
    calle?: Calle[];
    frente?: number;
    fondo?: number;
    superficie?: number; 
    estado: EstadoLote;
    subestado: SubestadoLote;
    descripcion?: string;
}

export interface LoteVenta extends Lote {
    deuda?: boolean;
    precio: number;
    propietario: Persona;
    ubicacion: Ubicacion;
}

export interface Venta {
    idVenta: number;
    lote: LoteVenta;
    comprador: Persona;
    fechaVenta: string;
    montoTotal: number;
}

export interface EspacioComun extends Lote {
    capacidad: number;
    nombre: string;
}

export interface CambioEstado {
    idCambio: number;
    lote: Lote;
    estadoAnterior: EstadoLote;
    estadoNuevo: EstadoLote;
    fechaCambio: string;
}

export interface Inmobiliaria {
    idInmobiliaria: number;
    nombre: string;
    telefono?: string;
    email?: string;
}

export interface Reserva {
    idReserva: number;
    lote: LoteVenta;
    cliente: Persona;
    fechaReserva: string; 
    seña?: number;
    inmobiliaria?: Inmobiliaria;
}


// --- INTERFACES PARA PETICIONES Y RESPUESTAS DE LA API ---
// Definen la forma de los datos que se envían y reciben en cada endpoint.

// Lotes
export interface GetLotesResponse {
    lotes: LoteVenta[];
}

export interface PostLoteRequest {
    fraccion: number;
    numero: number;
    estado: EstadoLote;
    subestado: SubestadoLote;
    propietario: Persona;
    precio: number;
    ubicacion: Ubicacion;
    superficie?: number;
    descripcion?: string;
}

export interface PutLoteRequest {
    estado?: EstadoLote;
    subestado?: SubestadoLote;
    propietario?: Persona;
    precio?: number;
    ubicacion?: Ubicacion;
    descripcion?: string;
}

// Ventas
export interface GetVentasResponse {
    ventas: Venta[];
}

export interface PostVentaRequest {
    idLote: number;
    montoTotal: number;
    idComprador: number; // Es mejor enviar solo el ID
    fechaVenta: string;
}

// Reservas
export interface GetReservasResponse {
    reservas: Reserva[];
}

export interface PostReservaRequest {
    idLote: number;
    idCliente: number; // Es mejor enviar solo el ID
    fechaReserva: string;
    seña?: number;
    idInmobiliaria?: number;
}