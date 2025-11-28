// Convierte los filtros aplicados en "chips" para mostrar en la UI
// y también tiene la función "nice" para formatear strings (ej: "NO_DISPONIBLE" -> "No Disponible")
export const nice = (s) =>
  (s ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function chipsFrom(applied, D, isInmo) {
  const arr = [];
  if (applied.q) arr.push({ k: "q", label: `Buscar: ${applied.q}` });

  (applied.estado || [])
    .filter((v) => (isInmo ? v !== "NO_DISPONIBLE" : true))
    .forEach((v) => arr.push({ k: "estado", v, label: nice(v) }));

  (applied.subestado || []).forEach((v) => arr.push({ k: "subestado", v, label: nice(v) }));
  (applied.calle || []).forEach((v) => arr.push({ k: "calle", v, label: nice(v) }));
  (applied.fraccion || []).forEach((v) => arr.push({ k: "fraccion", v, label: `Fracción ${v}` }));

  if (applied.frente && (applied.frente.min !== D.frente.min || applied.frente.max !== D.frente.max)) {
    arr.push({ k: "frente", label: `Frente ${applied.frente.min}–${applied.frente.max} m` });
  }
  if (applied.fondo && (applied.fondo.min !== D.fondo.min || applied.fondo.max !== D.fondo.max)) {
    arr.push({ k: "fondo", label: `Fondo ${applied.fondo.min}–${applied.fondo.max} m` });
  }
  if (applied.sup && (applied.sup.min !== D.sup.min || applied.sup.max !== D.sup.max)) {
    arr.push({ k: "sup", label: `Sup ${applied.sup.min}–${applied.sup.max} m²` });
  }
  if (applied.precio && (applied.precio.min !== D.precio.min || applied.precio.max !== D.precio.max)) {
    arr.push({ k: "precio", label: `Precio ${applied.precio.min}–${applied.precio.max} USD` });
  }
  if (!isInmo && applied.deudor !== null) {
    arr.push({ k: "deudor", label: applied.deudor ? "Solo deudor" : "Sin deuda" });
  }
  return arr;
}
