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
