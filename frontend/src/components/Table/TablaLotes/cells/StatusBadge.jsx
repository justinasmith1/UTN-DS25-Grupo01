// src/components/TablaLotes/cells/StatusBadge.jsx
import React from 'react';

const badge = (label, variant = 'muted') => (
  <span className={`tl-badge tl-badge--${variant}`}>{label}</span>
);

/**
 * Normaliza un estado de lote:
 *  - null/undefined → '—'
 *  - 'EN_PROMOCION' → 'En promocion'
 */
export const fmtEstadoLote = (s) =>
  !s
    ? '—'
    : String(s)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());

export const getEstadoVariant = (raw) => {
  const s = fmtEstadoLote(raw).toUpperCase(); // DISPO / EN PROMOCION / etc.
  const map = {
    'DISPONIBLE': 'info', // Color que tenía RESERVADO (azul)
    'EN PROMOCION': 'warn',
    'RESERVADO': 'success', // Color que tenía DISPONIBLE (verde)
    'ALQUILADO': 'indigo',
    'VENDIDO': 'warn', // Amarillo/naranja
    'NO DISPONIBLE': 'danger',
  };
  return map[s] || 'muted';
};

export default function StatusBadge({ value }) {
  const label = fmtEstadoLote(value).toUpperCase();
  const variant = getEstadoVariant(value);
  return badge(label, variant);
}

// helper para compatibilidad con la función antigua
export const estadoBadge = (raw) => <StatusBadge value={raw} />;
