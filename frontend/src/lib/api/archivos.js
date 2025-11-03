// src/lib/api/archivos.js
// API adapter para archivos/documentos

import { http } from '../http/http';

const PRIMARY = "/files";

/**
 * Obtiene todos los archivos de un lote
 * @param {number} loteId - ID del lote
 * @returns {Promise<Array>} Lista de archivos
 */
export async function getArchivosByLote(loteId) {
  if (!loteId) return [];
  
  try {
    const res = await http(`${PRIMARY}/lote/${loteId}`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      throw new Error(data?.message || "Error al obtener archivos");
    }
    
    // Normalizar respuesta - puede venir como array directo o dentro de data
    const archivos = Array.isArray(data) ? data : (data?.archivos || data?.data || []);
    
    return archivos.map(archivo => ({
      id: archivo.id,
      filename: archivo.filename || archivo.nombreArchivo,
      url: archivo.url || archivo.linkArchivo,
      tipo: archivo.tipo, // BOLETO, ESCRITURA, PLANO, IMAGEN
      uploadedAt: archivo.uploadedAt || archivo.createdAt,
      uploadedBy: archivo.uploadedBy,
      idLoteAsociado: archivo.idLoteAsociado,
    }));
  } catch (error) {
    console.error("Error obteniendo archivos por lote:", error);
    return [];
  }
}

/**
 * Obtiene un archivo por ID
 * @param {number} id - ID del archivo
 * @returns {Promise<Object>} Archivo
 */
export async function getArchivoById(id) {
  try {
    const res = await http(`${PRIMARY}/${id}`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      throw new Error(data?.message || "Error al obtener archivo");
    }
    
    const archivo = data?.archivo || data?.data || data;
    
    return {
      id: archivo.id,
      filename: archivo.filename || archivo.nombreArchivo,
      url: archivo.url || archivo.linkArchivo,
      tipo: archivo.tipo,
      uploadedAt: archivo.uploadedAt || archivo.createdAt,
      uploadedBy: archivo.uploadedBy,
      idLoteAsociado: archivo.idLoteAsociado,
    };
  } catch (error) {
    console.error("Error obteniendo archivo por id:", error);
    throw error;
  }
}

