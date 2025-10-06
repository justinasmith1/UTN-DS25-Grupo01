// src/components/TablaLotes/cells/SubstatusBadge.jsx
import React from 'react';

const badge = (label, variant = 'muted') => (
  <span className={`tl-badge tl-badge--${variant}`}>{label}</span>
);

const fmtEstado = (s) =>
  !s ? '—'
     : String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

export default function SubstatusBadge({ value }) {
  const s = fmtEstado(value).toUpperCase();
  const map = {
    'CONSTRUIDO': 'success',
    'EN CONSTRUCCION': 'warn',
    'NO CONSTRUIDO': 'danger',
  };
  return badge(s, map[s] || 'muted');
}

export const subestadoBadge = (raw) => <SubstatusBadge value={raw} />;
