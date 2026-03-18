// src/lib/api/pagos.js
// API del submódulo Pagos (dentro de Ventas). Solo lectura en este bloque.

import { http } from "../http/http";

const BASE = "/ventas";

/**
 * Obtiene el contexto completo de pagos de una venta: venta, plan vigente,
 * cuotas, pagos y resumen.
 * @param {number} ventaId - ID de la venta
 * @returns {Promise<{venta, planVigente, cuotas, pagos, resumen}>}
 */
export async function getPagosContextByVentaId(ventaId) {
  const res = await http(`${BASE}/${ventaId}/pagos`, { method: "GET" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || "Error al obtener el contexto de pagos";
    const err = new Error(msg);
    err.statusCode = res.status;
    err.response = data;
    throw err;
  }

  return data?.data ?? data;
}

/**
 * Crea el plan inicial de pago para una venta.
 * @param {number} ventaId - ID de la venta
 * @param {object} payload - { nombre, tipoFinanciacion, moneda, cantidadCuotas, montoTotalPlanificado, fechaInicio, montoAnticipo?, observaciones?, descripcion?, cuotas }
 * @returns {Promise<object>}
 */
export async function createPlanPagoInicial(ventaId, payload) {
  const res = await http(`${BASE}/${ventaId}/pagos/plan`, {
    method: "POST",
    body: payload,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || "Error al crear el plan de pago";
    const err = new Error(msg);
    err.statusCode = res.status;
    err.response = data;
    throw err;
  }

  return data?.data ?? data;
}
