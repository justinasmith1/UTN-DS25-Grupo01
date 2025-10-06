// src/components/TablaLotes/utils/getters.js
export function getPropietarioNombre(l) {
  const p = l?.propietario;
  if (!p) return l?.propietarioNombre ?? l?.ownerName ?? '—';
  if (p.nombreCompleto) return p.nombreCompleto;
  const partes = [p.nombre, p.apellido].filter(Boolean);
  if (partes.length) return partes.join(' ');
  return p.razonSocial ?? String(p.id ?? '—');
}

export function getCalle(l) {
  const u = l?.ubicacion;
  return u?.calle ?? u?.nombreCalle ?? l?.calle ?? '—';
}

export function getNumero(l) {
  const u = l?.ubicacion;
  return u?.numero ?? l?.numero ?? '—';
}
