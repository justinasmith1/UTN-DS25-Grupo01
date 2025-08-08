// interfacesCCLF.d.ts

import e from "express";

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
    idLote: number
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
    total: number;
}

export interface GetLoteResponse {
    lote: LoteVenta | null;
    message?: string;
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

export interface PostLoteResponse {
    lote: LoteVenta | null;
    message: string;
}

export interface PutLoteRequest {
    id: number;
    fraccion?: number;
    numero?: number;
    estado?: EstadoLote;
    subestado?: SubestadoLote;
    propietario?: Persona;
    precio?: number;
    ubicacion?: Ubicacion;
    descripcion?: string;
}

export interface PutLoteResponse {
    message: string;
}

export interface DeleteLoteRequest {
    idLote: number;
}

export interface DeleteLoteResponse {
    message: string;
}

// Ventas
export interface GetVentasResponse {
    ventas: Venta[];
    total: number;
}

export interface PostVentaRequest {
    idLote: number;
    montoTotal: number;
    idComprador: number; // Es mejor enviar solo el ID
    fechaVenta: string;
}

export interface PostVentaResponse {
    venta: Venta | null;
    message: string;
}

export interface GetVentaRequest {
    idVenta: number;
}

export interface GetVentaResponse {
    venta: Venta | null;
    message?: string;
}

export interface PutVentaRequest {
    idVenta: number;
    idLote?: number;
    montoTotal?: number;
    idComprador?: number; // Es mejor enviar solo el ID
    fechaVenta?: string;
}

export interface PutVentaResponse {
    message: string;
}

export interface DeleteVentaRequest {
    idVenta: number;
}

export interface DeleteVentaResponse {
    message: string;
}

// Reservas
export interface GetReservasResponse {
    reservas: Reserva[];
    total: number;
}

export interface PostReservaRequest {
    idLote: number;
    idCliente: number; // Es mejor enviar solo el ID
    fechaReserva: string;
    seña?: number;
    idInmobiliaria?: number;
}