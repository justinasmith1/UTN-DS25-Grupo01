import { LoteVenta, Persona, SubestadoLote, EstadoLote, Ubicacion} from '../types/interfacesCCLF.d';

let lotes: LoteVenta[] = [
    {
      idLote: 1, 
      estado: "Disponible" as EstadoLote,
      subestado: "En Construccion" as SubestadoLote, 
      propietario: { nombre: "CCLF" } as Persona, 
      superficie: 500, 
      precio: 50000,
      ubicacion: "Norte" as Ubicacion, 
      descripcion: "Vista al lago, Acceso pavimentado, Servicios completos", 
      fraccion: 1, 
      numPartido: 62,
  },
  {
    idLote: 2,
    estado: "Vendido" as EstadoLote,
    subestado: "En Construccion" as SubestadoLote,
    propietario: { nombre: "Juan Pérez" } as Persona,
    superficie: 600,
    precio: 65000,
    ubicacion: "Sur" as Ubicacion,
    descripcion: "Cerca del Club House, Arboleda añosa",
    fraccion: 1,
    numPartido: 62,
  },
  {
    idLote: 3,
    estado: "No Disponible" as EstadoLote,
    subestado: "Construido" as SubestadoLote,
    propietario: { nombre: "Ana Gómez" } as Persona,
    superficie: 550,
    precio: 58000,
    ubicacion: "Este" as Ubicacion,
    descripcion: "Esquina privilegiada, Vista panorámica",
    fraccion: 2,
    numPartido: 62,
  },
  {
    idLote: 4,
    estado: "No Disponible" as EstadoLote,
    subestado: "No Construido" as SubestadoLote,
    propietario: { nombre: "Carlos López" } as Persona,
    superficie: 700,
    precio: 72000,
    ubicacion: "Oeste" as Ubicacion,
    descripcion: "Amplio frente, Ideal para familias",
    fraccion: 2,
    numPartido: 62,
  },
  {
    idLote: 5,
    estado: "Disponible" as EstadoLote,
    subestado: "Construido" as SubestadoLote,
    propietario: { nombre: "CCLF" } as Persona,
    superficie: 520,
    precio: 52000,
    ubicacion: "Norte" as Ubicacion,
    descripcion: "Excelente ubicación, Listo para construir",
    fraccion: 3,
    numPartido: 62,
    }
];

export const getLotes = async (): Promise<LoteVenta[]> => lotes;

export const getLotesById = async (id: number): Promise<LoteVenta | undefined> => lotes.find(lote => lote.idLote === id);

export const createLote = async (data: any): Promise<LoteVenta> => {
  const nuevoId = Math.max(...lotes.map(lote => lote.idLote)) + 1;
  const nuevoLote = { idLote: nuevoId, ...data };
  lotes.push(nuevoLote);
  return nuevoLote;
};

export const updateLote = async (id: number, data: Partial<LoteVenta>): Promise<LoteVenta | null> => {
  const index = lotes.findIndex(lote => lote.idLote === id);
  if (index === -1) return null;
  lotes[index] = { ...lotes[index], ...data };
  return lotes[index];
};

export const deleteLote = async (id: number): Promise<boolean> => {
  const index = lotes.findIndex(lote => lote.idLote === id);
  if (index === -1) return false;
  lotes.splice(index, 1);
  return true;
};

