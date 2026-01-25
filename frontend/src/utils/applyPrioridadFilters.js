// src/utils/applyPrioridadFilters.js
// Aplica filtros locales sobre el array de prioridades (lado frontend)

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

const getOwnerType = (p) => p?.ownerType ?? null;
const getOwnerName = (p) => {
  if (p?.ownerType === 'CCLF') return 'La Federala';
  return p?.inmobiliaria?.nombre ?? p?.inmobiliariaNombre ?? null;
};

export const applyPrioridadFilters = (prioridades, params = {}) => {
  if (!Array.isArray(prioridades)) return [];
  let filtered = [...prioridades];

  // 0) Visibilidad (estadoOperativo) - se filtra en backend, pero por si acaso aplicamos también en frontend
  const visibilidad = params.estadoOperativo ?? params.visibilidad ?? "OPERATIVO";
  if (visibilidad) {
    filtered = filtered.filter((p) => {
      const estadoOp = String(p?.estadoOperativo ?? "OPERATIVO").toUpperCase();
      return estadoOp === visibilidad.toUpperCase();
    });
  }

  // 1) Estado (multi)
  const estados = normArr(params.estado).map(upper);
  if (estados.length) {
    filtered = filtered.filter((p) => estados.includes(upper(p?.estado)));
  }

  // 2) Owner (multi - "La Federala" o inmobiliarias)
  if (params.owner && Array.isArray(params.owner) && params.owner.length > 0) {
    const ownerValues = new Set(params.owner.map(v => {
      if (typeof v === 'object') return v.value ?? v.label ?? v;
      if (typeof v === 'string' && v.toLowerCase().includes('federala')) return 'La Federala';
      return v;
    }));
    
    filtered = filtered.filter((p) => {
      const ownerType = getOwnerType(p);
      const ownerName = getOwnerName(p);
      
      // Si es "La Federala"
      if (ownerValues.has('La Federala') && ownerType === 'CCLF') return true;
      
      // Si es inmobiliaria (comparar por ID)
      if (ownerType === 'INMOBILIARIA') {
        const inmoId = p?.inmobiliariaId ?? p?.inmobiliaria?.id ?? null;
        if (inmoId == null) return false;
        
        // Comparar por ID numérico
        return Array.from(ownerValues).some(val => {
          const valNum = typeof val === 'number' ? val : parseInt(val, 10);
          return !isNaN(valNum) && Number(inmoId) === valNum;
        });
      }
      
      return false;
    });
  }

  // 3) Vencimiento (fechaFin - rango)
  if (params.fechaFin) {
    const min = toMs(params.fechaFin.min);
    const max = toMs(params.fechaFin.max);
    if (min != null || max != null) {
      filtered = filtered.filter((p) => {
        const t = toMs(p?.fechaFin);
        if (t == null) return false;
        if (min != null && t < min) return false;
        if (max != null && t > max) return false;
        return true;
      });
    }
  }

  return filtered;
};
