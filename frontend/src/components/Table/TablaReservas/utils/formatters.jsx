// src/components/Table/TablaReservas/utils/formatters.jsx
import React from 'react';

// Formateadores específicos para la tabla de reservas

export const fmtMoney = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
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

export const fmtClienteCompleto = (row) => {
  if (!row) return '—';
  
  // Intentar diferentes formas de obtener el nombre completo
  if (row.clienteCompleto) return row.clienteCompleto;
  if (row.cliente?.nombreCompleto) return row.cliente.nombreCompleto;
  if (row.cliente?.nombre && row.cliente?.apellido) {
    return `${row.cliente.nombre} ${row.cliente.apellido}`.trim();
  }
  if (row.clienteNombre && row.clienteApellido) {
    return `${row.clienteNombre} ${row.clienteApellido}`.trim();
  }
  if (row.cliente?.nombre) return row.cliente.nombre;
  if (row.clienteNombre) return row.clienteNombre;
  
  return '—';
};

export const fmtLoteInfo = (row) => {
  if (!row.loteInfo) return '—';
  const { fraccion, calle, numero } = row.loteInfo;
  return `${fraccion} - ${calle} ${numero}`;
};

export const fmtInmobiliaria = (nombre) => {
  if (!nombre) return '—';
  return nombre;
};

export const fmtSeña = (sena) => {
  if (sena == null || sena === '') return '—';
  const n = Number(sena);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
};

export const fmtEstado = (estado) => {
  if (!estado) return '—';
  
  // Mapeo de estados para reservas (si es necesario)
  const estadoMap = {
    'ACTIVA': 'Activa',
    'CANCELADA': 'Cancelada',
    'COMPLETADA': 'Completada',
    'PENDIENTE': 'Pendiente',
  };
  
  return estadoMap[estado] || estado;
};
