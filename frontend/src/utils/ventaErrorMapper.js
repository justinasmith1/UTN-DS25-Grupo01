// Mapa de keywords para detección inteligente de errores del backend
const ERROR_KEYWORDS = [
  { pattern: /fechaVenta|fecha.*venta/i, field: "fechaVenta" },
  { pattern: /fechaEscrituraReal/i, field: "fechaEscrituraReal" },
  { pattern: /fechaCancelaci[oó]n/i, field: "fechaCancelacion" },
  { pattern: /motivoCancelaci[oó]n/i, field: "motivoCancelacion" },
  { pattern: /estado/i, field: "estado" },
  { pattern: /n[uú]mero/i, field: "numero" },
  { pattern: /comprador|compradores/i, field: "compradores" },
  // Campos más específicos de creación
  { pattern: /loteId|lote/i, field: "loteId" },
  { pattern: /monto/i, field: "monto" },
  { pattern: /tipoPago|tipo de pago/i, field: "tipoPago" },
];

/**
 * Mapea un error del backend (Zod / dominio) a errores por campo + mensaje general.
 * No cambia reglas de negocio, solo distribuye mensajes en la UI.
 */
export function mapVentaBackendError(error, options = {}) {
  const { defaultMessage = "Error al guardar la venta" } = options;
  const fieldErrors = {};

  const errorMsg =
    error?.message ||
    error?.response?.data?.message ||
    defaultMessage;

  // Caso 1: transición de estado inválida → error en campo estado
  if (/transici[oó]n.*inválida|transición.*estado/i.test(errorMsg)) {
    fieldErrors.estado = errorMsg;
    return { fieldErrors, generalMessage: null };
  }

  // Caso 2: Errores estructurados de Zod (array de errores)
  if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    error.response.data.errors.forEach((err) => {
      const campo = err.path?.[0] || "";
      const mensaje = err.message || "";

      // Mapear por campo explícito
      if (campo) {
        fieldErrors[campo] = mensaje || fieldErrors[campo] || "Error de validación";
        return;
      }

      // Si no hay campo, intentar por keyword
      const matchedKeyword = ERROR_KEYWORDS.find(k => k.pattern.test(mensaje));
      if (matchedKeyword) {
        fieldErrors[matchedKeyword.field] = mensaje || fieldErrors[matchedKeyword.field] || "Error de validación";
      }
    });

    const generalMessage = errorMsg && Object.keys(fieldErrors).length === 0 ? errorMsg : null;
    return { fieldErrors, generalMessage };
  }

  // Caso 3: Error de unicidad de número (común)
  if (/n[uú]mero.*existe|unique.*numero/i.test(errorMsg)) {
    fieldErrors.numero = "Ya existe una venta con este número";
    return { fieldErrors, generalMessage: null };
  }

  // Caso 4: Detección por keywords en mensaje plano
  const matchedKeyword = ERROR_KEYWORDS.find(k => k.pattern.test(errorMsg));
  if (matchedKeyword) {
    fieldErrors[matchedKeyword.field] = errorMsg;
    return { fieldErrors, generalMessage: null };
  }

  // Si no se pudo mapear a ningún campo, lo tratamos como error general
  return { fieldErrors, generalMessage: errorMsg };
}

