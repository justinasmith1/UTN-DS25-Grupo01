// src/lib/api/fracciones.js
// API adapter para fracciones

import { httpJson } from "../http/http";

/* --------------------------- EXPORT PÚBLICO --------------------------- */

/**
 * Obtener todas las fracciones
 * @returns {Promise<{success: boolean, data?: {fracciones: Array, total: number}, message?: string}>}
 */
export async function getAllFracciones() {
  try {
    const response = await httpJson("/fracciones", { method: "GET" });
    
    // El backend devuelve { success: true, fracciones: [...], total: N }
    const fracciones = response?.fracciones ?? response?.data?.fracciones ?? [];
    const total = response?.total ?? response?.data?.total ?? 0;
    
    return {
      success: true,
      data: { fracciones, total },
      message: response?.message || "Fracciones obtenidas exitosamente"
    };
  } catch (error) {
    console.error("Error obteniendo fracciones:", error);
    return {
      success: false,
      data: { fracciones: [], total: 0 },
      message: error?.message || "Error al obtener fracciones"
    };
  }
}

/**
 * Obtener fracción por ID
 * @param {number} id 
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export async function getFraccionById(id) {
  try {
    const response = await httpJson(`/fracciones/${id}`, { method: "GET" });
    
    const fraccion = response?.fraccion ?? response?.data ?? null;
    
    return {
      success: true,
      data: fraccion,
      message: response?.message || "Fracción obtenida exitosamente"
    };
  } catch (error) {
    console.error("Error obteniendo fracción:", error);
    return {
      success: false,
      data: null,
      message: error?.message || "Error al obtener la fracción"
    };
  }
}
