// Centraliza defaults y armado de params hacia el tablero

export function filterDefaultsFromPreset(preset) {
  return preset?.defaults ?? {
    q: "",
    estado: [],
    subestado: [],
    calle: [],
    frente: { min: 0, max: 100 },
    fondo: { min: 0, max: 100 },
    sup: { min: 0, max: 5000 },
    precio: { min: 0, max: 300000 },
    deudor: null,
  };
}

export function buildParams(F, D, isInmo) {
  const params = {
    q: F.q || "",
    estado: F.estado || [],
    subestado: F.subestado || [],
    calle: F.calle || [],
    deudor: isInmo ? null : (F.deudor ?? null),
  };
  if (F.frente?.min !== D.frente.min || F.frente?.max !== D.frente.max) {
    params.frenteMin = F.frente.min;
    params.frenteMax = F.frente.max;
  }
  if (F.fondo?.min !== D.fondo.min || F.fondo?.max !== D.fondo.max) {
    params.fondoMin = F.fondo.min;
    params.fondoMax = F.fondo.max;
  }
  if (F.sup?.min !== D.sup.min || F.sup?.max !== D.sup.max) {
    params.supMin = F.sup.min;
    params.supMax = F.sup.max;
  }
  if (F.precio?.min !== D.precio.min || F.precio?.max !== D.precio.max) {
    params.priceMin = F.precio.min;
    params.priceMax = F.precio.max;
  }
  return params;
}
