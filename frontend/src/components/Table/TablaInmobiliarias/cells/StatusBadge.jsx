// src/components/TablaInmobiliarias/cells/StatusBadge.jsx
import React from 'react';

const badge = (label, variant = 'muted') => (
  <span className={`tl-badge tl-badge--${variant}`}>{label}</span>
);

export default function StatusBadge({ value, type = 'default' }) {
  if (!value) return badge('—', 'muted');
  
  const label = String(value);
  
  // Para comxventa (porcentaje)
  if (type === 'comxventa') {
    const num = Number(value);
    if (!isNaN(num)) {
      if (num >= 5) return badge(`${num}%`, 'success');
      if (num >= 3) return badge(`${num}%`, 'warn');
      return badge(`${num}%`, 'danger');
    }
  }
  
  // Para cantidad de ventas
  if (type === 'cantidad') {
    const num = Number(value);
    if (!isNaN(num)) {
      if (num >= 10) return badge(num.toLocaleString('es-AR'), 'success');
      if (num >= 5) return badge(num.toLocaleString('es-AR'), 'info');
      if (num >= 1) return badge(num.toLocaleString('es-AR'), 'warn');
      return badge('0', 'muted');
    }
  }
  
  // Default
  return badge(label, 'muted');
}
