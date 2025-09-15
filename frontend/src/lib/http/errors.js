// Devuelve un mensaje claro para cualquier error de red/API.
// Usalo en los catch: error(parseApiError(e, "mensaje fallback"))

export function parseApiError(err, fallback = "Ocurrió un error") {
  if (!err) return fallback;

  // Errores de red (fetch falló, CORS, server caído)
  if (err.name === "TypeError" && /fetch|network/i.test(String(err.message))) {
    return "No se pudo conectar con el servidor. Intentá de nuevo en unos minutos.";
  }

  // Si el adapter lanzó Error con message del backend
  if (err.message && typeof err.message === "string") {
    // Mensajes comunes a mapear
    const m = err.message.toLowerCase();
    if (m.includes("unauthorized") || m.includes("401")) return "Sesión expirada o inválida. Iniciá sesión de nuevo.";
    if (m.includes("forbidden")    || m.includes("403")) return "No tenés permisos para realizar esta acción.";
    if (m.includes("not found")    || m.includes("404")) return "Recurso no encontrado.";
    if (m.includes("conflict")     || m.includes("409")) return "Conflicto al procesar la operación.";
    if (m.includes("unprocessable")|| m.includes("422")) return "Datos inválidos. Revisá los campos.";
    if (m.includes("server")       || m.includes("500")) return "Error del servidor. Probá más tarde.";
    return err.message; // dejo el mensaje crudo si vino uno útil del back
  }

  // Fallback elegante
  return fallback;
}

// ─────────────────────────────────────────────────────────────
// Convierte la respuesta de error del backend (Zod u otros
// formatos comunes) en { formError, fieldErrors } apto para UI.
// ─────────────────────────────────────────────────────────────
export function mapApiValidationToFields(apiError) {
  const out = { formError: null, fieldErrors: {} };
  try {
    const data = apiError?.response?.data || apiError?.data || apiError;
    if (!data) return out;

    // Formato típico de Zod: { issues: [{ path: ["campo"], message: "..." }, ...] }
    if (Array.isArray(data.issues)) {
      for (const it of data.issues) {
        const key = Array.isArray(it.path) ? it.path[0] : it.path;
        if (key) out.fieldErrors[key] = it.message || 'Dato inválido';
      }
      return out;
    }

    // { errors: [{ path: "campo" | ["campo"], message: "..." }] }
    if (Array.isArray(data.errors)) {
      for (const it of data.errors) {
        const key = Array.isArray(it.path) ? it.path[0] : it.path;
        if (key) out.fieldErrors[key] = it.message || 'Dato inválido';
      }
      return out;
    }

    // { fieldErrors: { campo: "mensaje", ... } }
    if (data.fieldErrors && typeof data.fieldErrors === 'object') {
      out.fieldErrors = data.fieldErrors;
      return out;
    }

    // Mensaje general
    if (data.message) out.formError = data.message;
    return out;
  } catch {
    return out; // no rompemos la UI por errores en el mapeo
  }
}