/**
 * Mapea errores del backend (Zod / dominio) del submódulo Pagos a errores por campo.
 * Soporta paths anidados como cuotas.0.numeroCuota para mostrar errores en filas del cronograma.
 */
export function mapPagoBackendError(error, options = {}) {
  const { defaultMessage = "Error al crear el plan de pago" } = options;
  const fieldErrors = {};

  const errorMsg =
    error?.message ||
    error?.response?.message ||
    defaultMessage;

  // Errores estructurados de Zod (array con field + message)
  const errors = error?.response?.errors;
  if (errors && Array.isArray(errors)) {
    errors.forEach((err) => {
      const field = err.field ?? err.path?.[0] ?? "";
      const mensaje = err.message || "";
      if (field) {
        fieldErrors[field] = mensaje || fieldErrors[field] || "Error de validación";
      }
    });

    const generalMessage =
      errorMsg && Object.keys(fieldErrors).length === 0 ? errorMsg : null;
    return { fieldErrors, generalMessage };
  }

  // Errores 403/409 u otros: mensaje general sin campo
  return { fieldErrors, generalMessage: errorMsg };
}

const HINT_ACTUALIZAR = " Cerrá este formulario o actualizá la página y volvé a intentar.";

/** Mensajes 409 del servicio de registro de pago → texto claro para el usuario */
function mapRegistrarPagoConflictMessage(raw) {
  const msg = String(raw || "").trim();
  const table = {
    "La venta está eliminada": "La venta no está disponible para registrar pagos.",
    "La venta no tiene un plan de pago vigente": "No hay plan de pago vigente. Verificá la venta o actualizá la página.",
    "Cuota no encontrada": "No se encontró la cuota indicada." + HINT_ACTUALIZAR,
    "La cuota indicada no pertenece al plan vigente de la venta":
      "Esa cuota no corresponde al plan vigente." + HINT_ACTUALIZAR,
    "La cuota ya está paga o no tiene saldo pendiente":
      "Esta cuota ya no tiene saldo pendiente (puede estar paga)." + HINT_ACTUALIZAR,
    "No hay cuotas pendientes de pago": "No quedan cuotas pendientes de cobro.",
    "Solo puede registrarse pago sobre la primera cuota con saldo pendiente":
      "Solo se puede cobrar la próxima cuota en orden. Los datos pueden haber cambiado." + HINT_ACTUALIZAR,
    "El monto del pago supera el saldo pendiente de la cuota":
      "El monto supera el saldo pendiente de la cuota (puede haberse actualizado)." + HINT_ACTUALIZAR,
  };
  if (table[msg]) return table[msg];
  if (msg.toLowerCase().includes("supera el saldo")) {
    return table["El monto del pago supera el saldo pendiente de la cuota"];
  }
  if (msg.toLowerCase().includes("primera cuota")) {
    return table["Solo puede registrarse pago sobre la primera cuota con saldo pendiente"];
  }
  return msg + (msg.endsWith(".") ? "" : ".") + HINT_ACTUALIZAR;
}

/**
 * Errores al registrar un pago: campos Zod + conflictos 409 con mensajes accionables.
 * @param {Error & { statusCode?: number; response?: object }} error
 * @returns {{ fieldErrors: Record<string, string>, generalMessage: string | null }}
 */
export function mapRegistrarPagoError(error) {
  const base = mapPagoBackendError(error, { defaultMessage: "Error al registrar el pago" });
  if (Object.keys(base.fieldErrors).length > 0) {
    return base;
  }

  const status = error?.statusCode;
  const rawMsg = error?.message || error?.response?.message || "";

  if (status === 409 && rawMsg) {
    return { fieldErrors: {}, generalMessage: mapRegistrarPagoConflictMessage(rawMsg) };
  }

  return base;
}

/** Mensajes 409 del servicio de recargo manual */
function mapAplicarRecargoConflictMessage(raw) {
  const msg = String(raw || "").trim();
  const table = {
    "La venta está eliminada": "La venta no está disponible para aplicar recargos.",
    "La venta no tiene un plan de pago vigente": "No hay plan de pago vigente. Verificá la venta o actualizá la página.",
    "Cuota no encontrada": "No se encontró la cuota indicada." + HINT_ACTUALIZAR,
    "La cuota indicada no pertenece al plan vigente de la venta":
      "Esa cuota no corresponde al plan vigente." + HINT_ACTUALIZAR,
    "La cuota ya está paga o no tiene saldo pendiente":
      "Esta cuota ya no tiene saldo pendiente (puede estar paga)." + HINT_ACTUALIZAR,
    "Solo se puede aplicar recargo a una cuota vencida con saldo pendiente":
      "Solo se puede aplicar recargo a una cuota vencida con saldo pendiente. Verificá fechas y saldo." +
      HINT_ACTUALIZAR,
  };
  if (table[msg]) return table[msg];
  if (msg.toLowerCase().includes("vencida")) {
    return table["Solo se puede aplicar recargo a una cuota vencida con saldo pendiente"];
  }
  return msg + (msg.endsWith(".") ? "" : ".") + HINT_ACTUALIZAR;
}

/**
 * Errores al aplicar recargo: Zod + 409.
 * @param {Error & { statusCode?: number; response?: object }} error
 */
export function mapAplicarRecargoError(error) {
  const base = mapPagoBackendError(error, { defaultMessage: "Error al aplicar el recargo" });
  if (Object.keys(base.fieldErrors).length > 0) {
    return base;
  }

  const status = error?.statusCode;
  const rawMsg = error?.message || error?.response?.message || "";

  if (status === 409 && rawMsg) {
    return { fieldErrors: {}, generalMessage: mapAplicarRecargoConflictMessage(rawMsg) };
  }

  return base;
}

const HINT_REEMPLAZO = " Cerrá el formulario o actualizá la página y volvé a intentar.";

/** Mensajes 409 / dominio al reemplazar plan → texto claro */
function mapReemplazarPlanConflictMessage(raw) {
  const msg = String(raw || "").trim();
  const table = {
    "La venta está eliminada": "La venta no está disponible para reemplazar el plan.",
    "La venta no tiene un plan vigente para reemplazar":
      "No hay plan vigente para reemplazar. Verificá la venta o actualizá la página.",
    "El reemplazo de plan solo aplica cuando ya existen pagos registrados sobre el plan vigente; hasta entonces puede editarse el plan directamente":
      "El reemplazo aplica solo cuando ya hay pagos registrados en este plan. Si aún no hay pagos, podés ajustar el plan de otra forma.",
    "No se permite cambiar la moneda al reemplazar el plan":
      "No se puede cambiar la moneda al reemplazar el plan. La moneda debe ser la del plan actual.",
    "El plan no puede reemplazarse porque no existe saldo pendiente":
      "No hay saldo pendiente para redistribuir; no corresponde reemplazar el plan.",
    "El nuevo cronograma debe coincidir con el saldo pendiente real":
      "La suma del nuevo cronograma no coincide con el saldo pendiente real. Revisá los montos de las cuotas.",
  };
  if (table[msg]) return table[msg];
  if (msg.toLowerCase().includes("saldo pendiente real") || msg.toLowerCase().includes("monto esperado")) {
    return table["El nuevo cronograma debe coincidir con el saldo pendiente real"];
  }
  if (msg.toLowerCase().includes("moneda")) {
    return table["No se permite cambiar la moneda al reemplazar el plan"];
  }
  return msg + (msg.endsWith(".") ? "" : ".") + HINT_REEMPLAZO;
}

/**
 * Errores al reemplazar plan: Zod (400) + conflictos 409.
 * @param {Error & { statusCode?: number; response?: object }} error
 */
export function mapReemplazarPlanPagoError(error) {
  const base = mapPagoBackendError(error, { defaultMessage: "Error al reemplazar el plan de pago" });
  if (Object.keys(base.fieldErrors).length > 0) {
    return base;
  }

  const status = error?.statusCode;
  const rawMsg = error?.message || error?.response?.message || "";

  if (status === 409 && rawMsg) {
    return { fieldErrors: {}, generalMessage: mapReemplazarPlanConflictMessage(rawMsg) };
  }

  return base;
}
