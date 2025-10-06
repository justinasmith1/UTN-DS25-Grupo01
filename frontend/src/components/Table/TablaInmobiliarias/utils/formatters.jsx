// src/components/TablaInmobiliarias/utils/formatters.jsx
import React from 'react';

// Formateadores específicos para la tabla de inmobiliarias

export const fmtComxVenta = (comx) => {
  if (comx == null || comx === '') return '—';
  const n = Number(comx);
  if (Number.isNaN(n)) return '—';
  return `${n}%`;
};

export const fmtCantidadVentas = (cantidad) => {
  if (cantidad == null || cantidad === '') return '—';
  const n = Number(cantidad);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR');
};

export const fmtFecha = (fecha) => {
  if (!fecha) return '—';
  try {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-AR');
  } catch {
    return '—';
  }
};

export const fmtContacto = (contacto) => {
  if (!contacto) return '—';
  return contacto;
};
