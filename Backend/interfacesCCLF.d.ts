// Interfaces para request/response de API de Club de Campo La Federala (CCLF)

// Vista: Dashboard Managment 

// Personas
export type Identificador = "DNI" | "CUIT" | "CUIL" | "Pasaporte";
export interface Persona {
    readonly nombre: string;
    readonly apellido: string;
    readonly idPersona: number;
    identificador: Identificador;
    telefono?: number;
    email?: string;

    constructor(nombre: string, apellido: string, idPersona: number, identificador: Identificador, telefono?: string, email?: string): Persona;
    setIdPersona(id: number): void;
    setNombre(nombre: string): void;
    setApellido(apellido: string): void;
    setId(id: number): void;
    setIdentificador(identificador: Identificador): void;
    setTelefono(telefono: string): void;
    setEmail(email: string): void;
    getIdPersona(): number;
    getNombre(): string;
    getApellido(): string;
    getIdentificador(): Identificador;
    getTelefono(): string | undefined;
    getEmail(): string | undefined;
}

// Lotes
export type Calle = "Reinamora" | "Maca" | "Zorzal" | "Cauquén" | "Alondra" | "Jacana" | "Tacuarito" | "Jilguero" | "Golondrina" | "Calandria" | "Aguilamora" | "Lorca" | "Milano";
export type EstadoLote = "Disponible" | "Reservado" | "Vendido" | "No Disponible" | "Alquilado" | "En Promoción";
export type SubestadoLote = "En Construcción" | "No Construido" | "Construido";
export type Ubicacion = "Norte" | "Sur" | "Este" | "Oeste";

export interface Lote {
    readonly idLote: number;
    readonly fraccion: number;
    readonly numPartido: 62;
    numero?: number;
    calle?: Calle[];
    frente?: number;
    fondo?: number;
    estado: EstadoLote ;
    subestado: SubestadoLote;
    descripcion?: string;
    

    constructor(idLote: number, numero: number, calle: Calle[], frente: number, fondo: number, estado: EstadoLote, subestado: SubestadoLote, descripcion: string):Lote;
    setIdLote(id: number): void;
    setNumero(numero: number): void;
    setCalle(calle: Calle[]): void;
    setFrente(frente: number): void;
    setFondo(fondo: number): void;
    setEstado(estado: EstadoLote): void;
    setSubestado(subestado: SubestadoLote): void;
    setDescripcion(descripcion: string): void;
    getIdLote(): number;
    getNumero(): number;
    getCalle(): Calle[];
    getFrente(): number;
    getFondo(): number;
    getSuperficie(): number;
    getEstado(): EstadoLote;
    getSubestado(): SubestadoLote;
    getDescripcion(): string;
    
}

export interface LoteVenta extends Lote {
    deuda?: boolean;
    precio: number;
    propietario: Persona;
    ubicacion: Ubicacion;
    setDeuda(deuda: boolean): void;
    setPrecio(precio: number): void;
    getPrecio(): number;
    applyDiscount(discount: number): void;

}

// Request y Response para Lotes
export interface GetLotesResponse {
    lotes: LoteVenta[];
}

export interface GetLotesRequest {
    calle?: Calle[];
    estado?: EstadoLote;
    subestado?: SubestadoLote;
    numero?: number;
    fraccion?: number;
}

export interface PostLoteRequest {
    idLote: number;
    fraccion: number;
    numero: number;
    calle: Calle[];
    frente: number;
    fondo: number;
    estado: EstadoLote;
    subestado: SubestadoLote;
    descripcion?: string;
}

export interface PostLoteResponse {
    success: boolean;
    message: string;
    lote?: LoteVenta;
}

export interface PutLoteRequest {
    idLote: number;
    numero?: number;
    calle?: Calle[];
    frente?: number;
    fondo?: number;
    estado?: EstadoLote;
    subestado?: SubestadoLote;
    descripcion?: string;
}

export interface PutLoteResponse {
    success: boolean;
    message: string;
    lote?: LoteVenta;
}

export interface DeleteLoteRequest {
    idLote: number;
}

export interface DeleteLoteResponse {
    success: boolean;
    message: string;
}

// Ventas - Registrar la venta de un lote

export interface Venta {
    readonly idVenta: number;
    lote: LoteVenta;
    comprador: Persona;
    fechaVenta: string; // Formato ISO 8601
    montoTotal: number;
    constructor(idVenta: number, lote: LoteVenta, comprador: Persona, fechaVenta: string, montoTotal: number): Venta;
    setIdVenta(id: number): void;
    setLote(lote: LoteVenta): void;
    setComprador(comprador: Persona): void;
    setFechaVenta(fecha: string): void;
    setMontoTotal(monto: number): void;
    getIdVenta(): number;
    getLote(): LoteVenta;
    getComprador(): Persona;
    getFechaVenta(): string;
    getMontoTotal(): number;
}

export interface GetVentasRequest {
    idLote?: number;
    compradorId?: number;
    fechaDesde?: string; // Formato ISO 8601
    fechaHasta?: string; // Formato ISO 8601
}

export interface GetVentasResponse {
    ventas: Venta;
}

export interface PostVentaRequest {
    idLote: number;
    montoTotal: number;
    propietario: Persona;
    fechaVenta: string; // Formato ISO 8601
}


// Espacios Comunes
export interface EspacioComun extends Lote {
    capacidad: number;
    nombre: string;
    setCapacidad(capacidad: number): void;
    setNombre(nombre: string): void;
}

// Historial Cambios de Estado de Lote
export interface CambioEstado {
    readonly idCambio: number;
    lote: Lote;
    estadoAnterior: EstadoLote;
    estadoNuevo: EstadoLote;
    fechaCambio: string; // Formato ISO 8601
    constructor(idCambio: number, lote: Lote, estadoAnterior: EstadoLote, estadoNuevo: EstadoLote, fechaCambio: string): CambioEstado;
    setIdCambio(id: number): void;
    setLote(lote: Lote): void;
    setEstadoAnterior(estadoAnterior: EstadoLote): void;
    setEstadoNuevo(estadoNuevo: EstadoLote): void;
    setFechaCambio(fecha: string): void;
    getIdCambio(): number;
    getLote(): Lote;
    getEstadoAnterior(): EstadoLote;
    getEstadoNuevo(): EstadoLote;
    getFechaCambio(): string;
}

export interface GetCambiosEstadoRequest {
    idLote?: number;
    estadoAnterior?: EstadoLote;
    estadoNuevo?: EstadoLote;
    fechaDesde?: string; // Formato ISO 8601
    fechaHasta?: string; // Formato ISO 8601
}

export interface GetCambiosEstadoResponse {
    cambios: CambioEstado[];
}

export interface PostCambioEstadoRequest {
    idLote: number;
    estadoNuevo: EstadoLote;
    estadoAnterior: EstadoLote;
    fechaCambio: string; // Formato ISO 8601
}

export interface PostCambioEstadoResponse {
    success: boolean;
    message: string;
    cambio?: CambioEstado;
}

// Inmobiliarias
export interface Inmobiliaria {
    readonly idInmobiliaria: number;
    nombre: string;
    telefono?: string;
    email?: string;

    constructor(idInmobiliaria: number, nombre: string, telefono?: string, email?: string): Inmobiliaria;
    setIdInmobiliaria(id: number): void;
    setNombre(nombre: string): void;
    setTelefono(telefono: string): void;
    setEmail(email: string): void;
    getIdInmobiliaria(): number;
    getNombre(): string;
    getTelefono(): string | undefined;
    getEmail(): string | undefined;
}

// Reservas de Lotes
export interface Reserva {
    readonly idReserva: number;
    lote: LoteVenta;
    cliente: Persona;
    fechaReserva: string; // Formato ISO 8601
    seña?: number;
    inmobiliaria?: Inmobiliaria;
    constructor(idReserva: number, lote: LoteVenta, cliente: Persona, fechaReserva: string, seña?: number, inmobiliaria?: Inmobiliaria): Reserva;
    setSeña(seña: number): void;
    setIdReserva(id: number): void;
    setLote(lote: LoteVenta): void;
    setCliente(cliente: Persona): void;
    setFechaReserva(fecha: string): void;
    setInmobiliaria(inmobiliaria: Inmobiliaria): void;
    getIdReserva(): number;
    getLote(): LoteVenta;
    getCliente(): Persona;
    getFechaReserva(): string;
    getSeña(): number;
}

export interface GetReservasRequest {
    idLote?: number;    
    clienteId?: number;
    fechaDesde?: string; // Formato ISO 8601
    fechaHasta?: string; // Formato ISO 8601
    inmobiliariaId?: number;
}

export interface GetReservasResponse {
    reservas: Reserva[];
}

export interface PostReservaRequest {
    idLote: number;
    cliente: Persona;
    fechaReserva: string; // Formato ISO 8601
    seña?: number;
    inmobiliaria?: Inmobiliaria;
}

export interface PostReservaResponse {
    success: boolean;
    message: string;
    reserva?: Reserva;
}

export interface PutReservaRequest {
    idReserva: number;
    lote?: LoteVenta;
    cliente?: Persona;
    fechaReserva?: string; // Formato ISO 8601
    seña?: number;
    inmobiliaria?: Inmobiliaria;
}

export interface PutReservaResponse {
    success: boolean;
    message: string;
    reserva?: Reserva;
}

export interface DeleteReservaRequest {
    idReserva: number;
}

export interface DeleteReservaResponse {
    success: boolean;
    message: string;
}





