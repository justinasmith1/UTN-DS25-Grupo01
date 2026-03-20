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
