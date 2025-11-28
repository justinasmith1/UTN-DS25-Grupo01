import { http } from '../http/http';

const PRIMARY = "/files";

const getApiBase = () => {
  const RAW_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "";
  const FORCE_ABS = import.meta.env.VITE_API_FORCE_ABSOLUTE === "true";
  const isLocalAbs = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(RAW_BASE);
  return (import.meta.env.DEV && isLocalAbs && !FORCE_ABS) ? "/api" : (RAW_BASE || "/api");
};

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
    
    const archivos = Array.isArray(data) ? data : (data?.archivos || data?.data || []);
    
    return archivos.map(archivo => ({
      id: archivo.id,
      filename: archivo.filename || archivo.nombreArchivo,
      url: archivo.url || archivo.linkArchivo,
      tipo: archivo.tipo,
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

/**
 * Sube un archivo al backend
 * @param {File} file - Archivo a subir
 * @param {number} idLoteAsociado - ID del lote asociado
 * @param {string} tipo - Tipo de archivo: 'BOLETO' | 'ESCRITURA' | 'PLANO' | 'IMAGEN'
 * @returns {Promise<Object>} Archivo subido con metadata
 */
export async function uploadArchivo(file, idLoteAsociado, tipo = 'IMAGEN') {
  if (!file) {
    throw new Error("No se proporcionó ningún archivo");
  }
  if (!idLoteAsociado) {
    throw new Error("Se requiere el ID del lote asociado");
  }

  try {
    // Crear FormData para multipart/form-data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idLoteAsociado', String(idLoteAsociado));
    formData.append('tipo', tipo);

    const { getAccessToken } = await import('../auth/token');
    const access = getAccessToken();
    const url = `${getApiBase()}${PRIMARY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      credentials: 'include',
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Error al subir archivo");
    }

    const archivo = data?.data || data?.archivo || data;
    
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
    console.error("Error subiendo archivo:", error);
    throw error;
  }
}

export async function deleteArchivo(id) {
  try {
    const res = await http(`${PRIMARY}/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));  
    if (!res.ok) {
      throw new Error(data?.message || "Error al eliminar archivo");
    }
    return true;
  } catch (error) {
    console.error("Error eliminando archivo:", error);
    throw error;
  }
}

/**
 * Obtiene la URL firmada (signed URL) de un archivo usando su ID
 * @param {number|string} fileId - ID del archivo
 * @returns {Promise<string|null>} URL firmada o null si hay error
 */
export async function getFileSignedUrl(fileId) {
  if (!fileId) return null;
  try {
    const res = await http(`${PRIMARY}/${fileId}`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok || !data) return null;
    
    const archivo = data?.archivo || data?.data || data;
    const objectPath = archivo?.url || archivo?.linkArchivo;
    if (!objectPath) return null;
    
    const { getAccessToken } = await import('../auth/token');
    const access = getAccessToken();
    
    const urlRes = await fetch(`${getApiBase()}${PRIMARY}/${fileId}/url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ filename: objectPath })
    });
    
    const urlData = await urlRes.json().catch(() => ({}));
    if (!urlRes.ok) return null;
    
    return urlData?.signedURL || urlData?.signedUrl || null;
  } catch (error) {
    return null;
  }
}