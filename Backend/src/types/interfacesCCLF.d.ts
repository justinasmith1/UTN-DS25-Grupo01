// interfacesCCLF.d.ts

import e from "express";
import { EstadoVenta } from "../generated/prisma";

// --- TIPOS BÁSICOS ---
// Estos tipos definen los valores permitidos para ciertas propiedades,
// lo que ayuda a prevenir errores de tipeo.

export type Identificador = "DNI" | "CUIT" | "CUIL" | "Pasaporte";
export type Calle = "Reinamora" | "Maca" | "Zorzal" | "Cauquén" | "Alondra" | "Jacana" | "Tacuarito" | "Jilguero" | "Golondrina" | "Calandria" | "Aguilamora" | "Lorca" | "Milano";
export type EstadoLoteOpc = "Disponible" | "Reservado" | "Vendido" | "No Disponible" | "Alquilado" | "En Promoción";
export type SubestadoLote = "En Construccion" | "No Construido" | "Construido";
export type UbicacionOpc = "Norte" | "Sur" | "Este" | "Oeste";
export type Rol = "Administrador" | "Inmobiliaria" | "Gestor" | "Tecnico";
export type TipoLote = "Lote Venta" | "Espacio Comun";
export type DateTime = string; // Formato ISO 8601: "YYYY-MM-DDTHH:MM:SSZ"

// --- INTERFACES DE DATOS (ESTRUCTURAS) ---
// Estas interfaces son los "planos" que definen cómo deben ser los objetos en la aplicación.

export interface Usuario {
    idUsuario: number;
    username: string;
    password: string;
    rol: Rol;
    email: string;
}

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

export interface Ubicacion {
    id: number;
    calle: Calle;
    numero: number;
}

export interface Fraccion {
    idFraccion: number;
    numero: number;
    lotes: Lote[];
}


export interface Venta {
    id: number;
    loteId: number;
    fechaVenta: string;
    monto: number;
    estado: EstadoVenta;
    plazoEscritura?: DateTime;
    tipoPago: string;
    compradorId: number;
    fechaVenta: DateTime;
    inmobiliariaId?: number;
    createdAt?: DateTime;
    updateAt?: DateTime;
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
    razonSocial?: string;
    comxventa?: number;
    contacto?: string;
    reservas?: Reserva[];
    venta?: Venta;
    user?: Usuario;
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
//----------------------------------------//
export interface GetLotesResponse {
    lotes: LoteVenta[];
    total: number;
}

export interface GetLoteResponse {
    lote: LoteVenta | null;
    message?: string;
}

export interface PostLoteRequest {
    id: number;
    fraccion: Fraccion;
    frente: number;
    fondo: number;
    tipo: TipoLote;
    estado: EstadoLoteOpc;
    subestado: SubestadoLote;
    propietario: Persona;
    precio: number;
    ubicacion?: Ubicacion;
    superficie?: number;
    descripcion?: string;
    capacidad?: number;
    nombre?: string;
    alquiler?: boolean;
    deuda?: boolean
    nombreEspacioComun?: string;
}

export interface PostLoteResponse {
    lote: LoteVenta | null;
    message: string;
}

export interface PutLoteRequest {
    id: number;
    fraccion?: Fraccion;
    frente?: number;
    fondo?: number;
    tipo?: TipoLote;
    estado?: EstadoLote;
    subestado?: SubestadoLote;
    propietario?: Persona;
    precio?: number;
    ubicacion?: Ubicacion;
    superficie?: number;
    descripcion?: string;
    capacidad?: number;
    nombre?: string;
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
//----------------------------------------//

// Ventas
//----------------------------------------//
export interface GetVentasResponse {
    ventas: Venta[];
    total: number;
}

export interface PostVentaRequest {
    id: number;
    loteId: number;
    lote: Lote;
    fechaVenta: DateTime;
    monto: number;
    estado: EstadoVenta;
    plazoEscritura?: DateTime;
    tipoPago: string;
    compradorId: number;  
    inmobiliariaId?: number;
    createdAt?: DateTime;
    updateAt?: DateTime;
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
    id: number;
    loteId?: number;
    monto?: number;
    compradorId?: number; // Es mejor enviar solo el ID
    fechaVenta?: DateTime
    estado?: EstadoVenta;
    plazoEscritura?: DateTime;
    tipoPago?: string;
    inmobiliariaId?: number;
    updateAt: DateTime;
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
//----------------------------------------//


// Reservas
//------------------------------------------------//
export interface GetReservasResponse {
  reservas: Reserva[];
  total: number;
}

// Request para crear una nueva reserva
export interface PostReservaRequest {
  idLote: number;           // ID del lote a reservar
  idCliente: number;        // ID del cliente que hace la reserva
  fechaReserva: string;     // Fecha de la reserva (ISO string)
  seña?: number;            // Monto de la seña (opcional)
  idInmobiliaria?: number;  // ID de la inmobiliaria (opcional)
}

// Response para crear una nueva reserva
export interface PostReservaResponse {
  reserva: Reserva | null;  // La reserva creada o null si falla
  message: string;          // Mensaje de confirmacion o error
}

// Request para obtener una reserva por ID
export interface GetReservaRequest {
  idReserva: number;
}

// Response para obtener una reserva por ID
export interface GetReservaResponse {
  reserva: Reserva | null;  // La reserva encontrada o null
  message?: string;         // Mensaje opcional
}

// Request para actualizar una reserva
export interface PutReservaRequest {
  idReserva: number;        // ID de la reserva a actualizar
  idLote?: number;          // ID de lote (opcional)
  idCliente?: number;       // ID de cliente (opcional)
  fechaReserva?: string;    // Fecha de reserva (opcional)
  seña?: number;            // Seña (opcional)
  idInmobiliaria?: number;  // ID inmobiliaria (opcional)
}

// Response para actualizar una reserva
export interface PutReservaResponse {
  message: string;          // Mensaje de confirmacion o error
}

// Request para eliminar una reserva
export interface DeleteReservaRequest {
  idReserva: number;
}

// Response para eliminar una reserva
export interface DeleteReservaResponse {
  message: string;
}
//------------------------------------------------//

//Inmobiliarias
//-----------------------------------------//
export interface GetInmobiliariasResponse {
  inmobiliarias: Inmobiliaria[];
  total: number;
}

//Request para crear una inmobiliaria
export interface PostInmobiliariaRequest{ 
  nombre: string; //Nombre de la inmobiliaria
  razonSocial: string; //Razon social (opcional)
  comxventa?: number; //Comision por venta (opcional)
  contacto?: string; //Telefono de contacto (opcional)
  reservas?: Reserva[]; //Reservas asociadas (opcional)
  ventaId?: number; //Ventas asociadas (opcional)
  userId?: number; //Usuario asociado (opcional)
}

// Response para crear una nueva inmobiliaria
export interface PostInmobiliariaResponse {
  inmobiliaria: Inmobiliaria | null;  // La inmobiliaria creada o null si falla
  message: string;          // Mensaje de confirmacion o error
}

// Request para obtener una inmobiliaria por ID
export interface GetInmobiliariaRequest {
  idInmobiliaria: number;
}

// Response para obtener una inmobiliaria por ID
export interface GetInmobiliariaResponse {
  inmobiliaria: Inmobiliaria | null;  // La reserva encontrada o null
  message?: string;         // Mensaje opcional
}

// Request para actualizar una inmobiliaria
export interface PutInmobiliariaRequest {
  nombre?: string; //Nombre de la inmobiliaria
  contacto?: string; //Telefono de contacto (opcional)
  razonSocial?: string; //Razon social (opcional)
  comxventa?: number; //Comision por venta (opcional) 
  userId?: number; //Usuario asociado (opcional)
  reservas?: Reserva[]; //Reservas asociadas (opcional)
  ventaId?: number; //Ventas asociadas (opcional)
}

// Response para actualizar una inmobiliaria
export interface PutInmobiliariaResponse {
  message: string;          // Mensaje de confirmacion o error
}

// Request para eliminar una inmobiliaria
export interface DeleteInmobiliariaRequest {
  idInmobiliaria: number;
}

// Response para eliminar una inmobiliaria
export interface DeleteInmobiliariaResponse {
  message: string;
}
//-----------------------------------------------------//


//Usuarios
//----------------------------------------//

export interface GetUsuariosResponse {
    usuarios: Usuario[];
    total: number;
}

export interface PostUsuarioRequest {
    username: string;
    password: string;
    rol: Rol;
    email: string;
}

export interface PostUsuarioResponse {
    usuario: Usuario | null;
    message: string;
}

export interface GetUsuarioRequest {
    idUsuario: number;
}

export interface GetUsuarioResponse {
    usuario: Usuario | null;
    message?: string;
}

export interface PutUsuarioRequest {
    username?: string;
    password?: string;
    rol?: Rol;
    email?: string;
}

export interface PutUsuarioResponse {
    message: string;
}

export interface DeleteUsuarioRequest {
    idUsuario: number;
}

export interface DeleteUsuarioResponse {
    message: string;
}
//----------------------------------------//