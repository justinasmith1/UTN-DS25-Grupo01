// src/components/TablaLotes/cells/StatusBadge.jsx
import React from 'react';

const badge = (label, variant = 'muted') => (
  <span className={`tl-badge tl-badge--${variant}`}>{label}</span>
);

const fmtEstado = (s) =>
  !s ? '—'
     : String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

export default function StatusBadge({ value }) {
  const s = fmtEstado(value).toUpperCase();
  const map = {
    'DISPONIBLE': 'success',
    'EN PROMOCION': 'warn',
    'RESERVADO': 'info',
    'ALQUILADO': 'indigo',
    'VENDIDO': 'success',
    'NO DISPONIBLE': 'danger',
  };
  return badge(s, map[s] || 'muted');
}

// helper para compatibilidad con la función antigua
export const estadoBadge = (raw) => <StatusBadge value={raw} />;
