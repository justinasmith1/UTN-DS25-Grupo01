// src/utils/applyLoteFilters.js
import { getLoteDisplayId } from "./mapaUtils";

export function applyLoteFilters(allLots = [], p = {}) {
  const norm = (s) => (s ?? "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  const getCalle = (l) => l?.ubicacion?.calle || l?.ubicacion?.nombreCalle || l?.location || l?.calle || "";
  const getEstado = (l) => l?.status || l?.estado || "";
  const getSub    = (l) => l?.subStatus || l?.subestado || l?.estadoPlano || "";
  const getFraccion = (l) => String(l?.fraccion?.numero ?? "");
  const num = (x) => (x === null || x === undefined || x === "" ? NaN : +x);

  const getSup    = (l) => num(l?.superficie ?? l?.superficieM2 ?? l?.m2 ?? l?.area);
  const getPrecio = (l) => num(l?.precioUSD ?? l?.priceUSD ?? l?.precio ?? l?.price);
  const getTipo   = (l) => l?.tipo ?? l?.tipoLote ?? null;
  // El filtro "solo deudores" debe restringir el query a lotes que tengan deuda (deuda === true).
  // El campo en el modelo es `deuda` (Boolean?).
  const getDeudor = (l) => {
    // Usar el campo real del modelo: deuda (Boolean?)
    return l?.deuda === true;
  };

  let rows = [...(allLots || [])];

  const q = (p.q || "").toString().trim().toLowerCase();
  if (q) {
    rows = rows.filter((l) => {
      const mapIdStr = (getLoteDisplayId(l) || "").toString().toLowerCase();
      const idStr = String(l?.id ?? "").toLowerCase();
      const owner = (l?.owner || l?.propietario || "").toString().toLowerCase();
      const calle = getCalle(l).toString().toLowerCase();
      return mapIdStr.includes(q) || idStr.includes(q) || owner.includes(q) || calle.includes(q);
    });
  }

  if (Array.isArray(p.estado) && p.estado.length > 0) {
    const set = new Set(p.estado.map(norm));
    rows = rows.filter((l) => set.has(norm(getEstado(l))));
  }

  // Filtro por ocupación (usar campo ocupacion del backend)
  if (p.ocupacion === 'ALQUILADO' || p.ocupacion === 'NO_ALQUILADO') {
    rows = rows.filter((l) => {
      const ocupacion = l?.ocupacion || (l?.alquilerActivo ? 'ALQUILADO' : 'NO_ALQUILADO');
      // Fallback legacy: usar campo alquiler si existe
      const ocupacionLegacy = l?.alquiler === true ? 'ALQUILADO' : 'NO_ALQUILADO';
      const ocupacionFinal = ocupacion || ocupacionLegacy;
      return ocupacionFinal === p.ocupacion;
    });
  }

  if (Array.isArray(p.subestado) && p.subestado.length > 0) {
    const set = new Set(p.subestado.map(norm));
    rows = rows.filter((l) => set.has(norm(getSub(l))));
  }

  if (Array.isArray(p.calle) && p.calle.length > 0) {
    const set = new Set(p.calle.map(norm));
    rows = rows.filter((l) => set.has(norm(getCalle(l))));
  }

  if (Array.isArray(p.fraccion) && p.fraccion.length > 0) {
    const set = new Set(p.fraccion.map(v => String(v)));
    rows = rows.filter((l) => set.has(getFraccion(l)));
  }

  if (p.tipo) {
    rows = rows.filter((l) => {
      const tipoLote = getTipo(l);
      return tipoLote === p.tipo;
    });
  }

  const inRange = (val, min, max) => {
    const v = Number.isFinite(val) ? val : NaN;
    if (Number.isNaN(v)) return false;
    if (min !== undefined && v < +min) return false;
    if (max !== undefined && v > +max) return false;
    return true;
  };

  if (p.supMin !== undefined || p.supMax !== undefined)
    rows = rows.filter((l) => inRange(getSup(l), p.supMin ?? -Infinity, p.supMax ?? Infinity));
  if (p.priceMin !== undefined || p.priceMax !== undefined)
    rows = rows.filter((l) => inRange(getPrecio(l), p.priceMin ?? -Infinity, p.priceMax ?? Infinity));

  if (p.deudor === true)  rows = rows.filter((l) => getDeudor(l) === true);
  if (p.deudor === false) rows = rows.filter((l) => getDeudor(l) === false);

  // Ordenar por ID ascendente por defecto
  rows.sort((a, b) => {
    const idA = a?.id ?? a?.idLote ?? 0;
    const idB = b?.id ?? b?.idLote ?? 0;
    return idA - idB;
  });

  return rows;
}
