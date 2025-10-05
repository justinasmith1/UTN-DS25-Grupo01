// src/components/TablaLotes/utils/formatters.js
import React from 'react';
// Formateadores reutilizables en la tabla de lotes para plata, metros, m2 y estado

export const fmtMoney = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
};

export const fmtM2 = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return (
    <span className="u-m2">
      {n.toLocaleString('es-AR')}
      <span className="u-unit">m²</span>
    </span>
  );
};

export const fmtM = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return (
    <span className="u-m2">
      {n.toLocaleString('es-AR')}
      <span className="u-unit">m</span>
    </span>
  );
};

export const fmtEstado = (s) =>
  !s ? '—'
     : String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
