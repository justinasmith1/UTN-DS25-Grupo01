// Centraliza defaults y armado de params hacia el tablero

export function filterDefaultsFromPreset(preset) {
  return preset?.defaults ?? {
    q: "",
    estado: [],
    subestado: [],
    calle: [],
    tipo: null,
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
    tipo: F.tipo || null,
    deudor: isInmo ? null : (F.deudor ?? null),
  };
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
