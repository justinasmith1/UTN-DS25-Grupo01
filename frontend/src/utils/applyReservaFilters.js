// src/utils/applyReservaFilters.js
// Aplica filtros locales sobre el array de reservas (lado frontend)

const toMs = (d) => {
  if (d == null) return null;
  if (typeof d === "number") return d;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
};

const normStr = (s) =>
  (s ?? "")
    .toString()
    .trim();

const upper = (s) => normStr(s).toUpperCase();
const normArr = (a) => (Array.isArray(a) ? a : []);

const getSenaNumber = (r) => {
  const raw = r?.sena ?? r?.seña ?? r?.deposit ?? r?.signal;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
const getInmoId = (r) =>
  r?.inmobiliariaId ?? r?.inmobiliaria?.id ?? r?.inmobiliaria_id ?? r?.inmobiliaria?.value;
const getInmoName = (r) =>
  r?.inmobiliariaNombre ?? r?.inmobiliaria?.nombre ?? r?.inmobiliaria?.label ?? r?.inmobiliaria;

/** * Normaliza el array de "inmobiliarias" que viene desde los filtros. */
const isNumericStr = (s) => typeof s === "string" && /^[0-9]+$/.test(s.trim());

const normalizeInmobiliariasFilter = (inmVals) => {
  const ids = new Set();
  const names = new Set();

  normArr(inmVals).forEach((v) => {
    if (v == null) return;

    // Caso objeto { value, label }
    if (typeof v === "object") {
      const val = v.value ?? null;
      const lab = v.label ?? v.nombre ?? v.name ?? null;
      if (val != null) ids.add(String(val));
      if (lab != null) names.add(upper(lab));
      return;
    }

    // Caso string/number
    if (typeof v === "number") {
      ids.add(String(v));
      return;
    }

    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return;
      // Si es todo dígitos => lo tomo como ID, si no => como nombre
      if (isNumericStr(s)) ids.add(s);
      // Siempre agrego también a names por si el backend/rows no traen id
      names.add(upper(s));
    }
  });

  return { ids, names };
};


export const applyReservaFilters = (reservas, params = {}) => {
  if (!Array.isArray(reservas)) return [];
  let filtered = [...reservas];

  // 1) Búsqueda general (q) — por cliente, inmobiliaria, lote, id
  if (params.q) {
    const q = normStr(params.q).toLowerCase();
    filtered = filtered.filter((r) => {
      const fields = [
        r?.clienteCompleto,
        r?.clienteNombre,
        r?.clienteApellido,
        getInmoName(r),
        r?.loteInfo?.calle,
        r?.loteInfo?.fraccion,
        r?.loteInfo?.numero,
        r?.id,
        r?.lotMapId,
        r?.lote?.mapId,
        r?.loteInfo?.mapId,
      ];
      return fields
        .map((x) => (x == null ? "" : String(x).toLowerCase()))
        .some((s) => s.includes(q));
    });
  }

  // 0) Visibilidad (estadoOperativo) - se filtra en backend, pero por si acaso aplicamos también en frontend
  const visibilidad = params.estadoOperativo ?? params.visibilidad ?? "OPERATIVO";
  if (visibilidad) {
    filtered = filtered.filter((r) => {
      const estadoOp = String(r?.estadoOperativo ?? "OPERATIVO").toUpperCase();
      return estadoOp === visibilidad.toUpperCase();
    });
  }

  // 2) Estado (multi) — comparamos en mayúsculas para evitar mismatches
  // NOTA: estado es el estado de negocio (ACTIVA, CANCELADA, etc.), NO estadoOperativo
  const estados = normArr(params.estado).map(upper);
  if (estados.length) {
    filtered = filtered.filter((r) => estados.includes(upper(r?.estado)));
  }

  // 3) Inmobiliaria (multi)
  //    Preferimos comparar por ID; si no hay ID en la fila, caemos a comparar por nombre/label.
  if (params.inmobiliarias && params.inmobiliarias.length) {
    const { ids, names } = normalizeInmobiliariasFilter(params.inmobiliarias);
    filtered = filtered.filter((r) => {
      const rid = getInmoId(r);
      const rname = getInmoName(r);
      const okById = rid != null && ids.has(String(rid));
      const okByName = rname != null && names.has(upper(rname));
      return (ids.size ? okById : false) || (names.size ? okByName : false);
    });
  }

  // 4) Fecha de Reserva (rango) — usa ms epoch
  if (params.fechaReserva) {
    const min = toMs(params.fechaReserva.min);
    const max = toMs(params.fechaReserva.max);
    if (min != null || max != null) {
      filtered = filtered.filter((r) => {
        const t = toMs(r?.fechaReserva);
        if (t == null) return false;
        if (min != null && t < min) return false;
        if (max != null && t > max) return false;
        return true;
      });
    }
  }

  // 5) Fecha de Creación (rango) — tu payload trae "createdAt"
  if (params.fechaCreacion) {
    const min = toMs(params.fechaCreacion.min);
    const max = toMs(params.fechaCreacion.max);
    if (min != null || max != null) {
      filtered = filtered.filter((r) => {
        const t = toMs(r?.createdAt ?? r?.fechaCreacion);
        if (t == null) return false;
        if (min != null && t < min) return false;
        if (max != null && t > max) return false;
        return true;
      });
    }
  }

  // 6) Seña (rango) — lee "sena" (sin ñ) y, si no existe, "seña".
  if (params.seña) {
    const min = params.seña.min != null ? Number(params.seña.min) : null;
    const max = params.seña.max != null ? Number(params.seña.max) : null;
    if (min != null || max != null) {
      filtered = filtered.filter((r) => {
        const s = getSenaNumber(r); // robusto a distintas llaves
        if (min != null && s < min) return false;
        if (max != null && s > max) return false;
        return true;
      });
    }
  }

  return filtered;
};
