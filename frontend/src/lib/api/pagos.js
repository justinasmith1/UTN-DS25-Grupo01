// src/lib/api/pagos.js
// API del submódulo Pagos (dentro de Ventas).

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

/**
 * Reemplaza el plan vigente (con pagos ya registrados) por uno nuevo sobre el saldo pendiente real.
 * @param {number} ventaId
 * @param {object} payload - Mismo cuerpo que creación salvo que el servidor no usa montoTotalPlanificado (usa saldo real).
 */
export async function reemplazarPlanPago(ventaId, payload) {
  const res = await http(`${BASE}/${ventaId}/pagos/plan/reemplazar`, {
    method: "POST",
    body: payload,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || "Error al reemplazar el plan de pago";
    const err = new Error(msg);
    err.statusCode = res.status;
    err.response = data;
    throw err;
  }

  return data?.data ?? data;
}

/**
 * Registra un pago sobre una cuota de la venta.
 * @param {number} ventaId - ID de la venta
 * @param {object} payload - { cuotaId, fechaPago, monto, medioPago, referencia?, observacion? }
 * @returns {Promise<object>}
 */
export async function registrarPagoEnVenta(ventaId, payload) {
  const res = await http(`${BASE}/${ventaId}/pagos`, {
    method: "POST",
    body: payload,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || "Error al registrar el pago";
    const err = new Error(msg);
    err.statusCode = res.status;
    err.response = data;
    throw err;
  }

  return data?.data ?? data;
}

/**
 * Aplica recargo manual sobre una cuota vencida (monto a sumar al recargo acumulado).
 * @param {number} ventaId
 * @param {{ cuotaId: number, montoRecargo: number, motivoRecargo: string }} payload
 */
export async function aplicarRecargoEnVenta(ventaId, payload) {
  const res = await http(`${BASE}/${ventaId}/pagos/recargo`, {
    method: "POST",
    body: payload,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || "Error al aplicar el recargo";
    const err = new Error(msg);
    err.statusCode = res.status;
    err.response = data;
    throw err;
  }

  return data?.data ?? data;
}
