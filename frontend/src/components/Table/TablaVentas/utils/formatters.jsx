// src/components/TablaVentas/utils/formatters.jsx
import React from 'react';
import StatusBadge from '../cells/StatusBadge';

// Formateadores específicos para la tabla de ventas

export const fmtMoney = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
};

export const fmtEstado = (s) => {
  if (!s) return '—';
  return String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
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

export const fmtPlazoEscritura = (dias) => {
  if (dias == null || dias === '') return '—';
  const n = Number(dias);
  if (Number.isNaN(n)) return '—';
  return `${n} días`;
};

export function formatEstadoVenta(estado) {
  return <StatusBadge status={estado} />;
}

// Helper para formatear tipo de pago (reutilizable en Ver Venta y Dashboard)
export const fmtTipoPago = (tipoPago) => {
  if (!tipoPago || (typeof tipoPago === 'string' && tipoPago.trim().length === 0)) {
    return '—';
  }
  const str = String(tipoPago).trim();
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};