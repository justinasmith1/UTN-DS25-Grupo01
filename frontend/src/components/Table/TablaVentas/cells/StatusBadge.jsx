// src/components/TablaVentas/cells/StatusBadge.jsx
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
    'CON BOLETO': 'success',
    'SIN BOLETO': 'warn',
    'EN PROCESO': 'info',
    'CANCELADA': 'danger',
    'COMPLETADA': 'success',
  };
  return badge(s, map[s] || 'muted');
}
