// src/components/Table/TablaVentas/presets/ventas.table.jsx
import React from 'react';
import { fmtMoney, fmtEstado } from '../utils/formatters';

// DEBUG: verificar que este preset sea el que usa la tabla de verdad
console.info('[Ventas][preset activo] ventas.table.jsx cargado');


export const ventasTablePreset = {
  key: 'ventas',

  COLUMN_TEMPLATES_BY_ROLE: {
    admin:        ['id', 'loteId', 'fechaVenta', 'estado', 'monto', 'comprador', 'inmobiliaria'],
    gestor:       ['id', 'loteId', 'fechaVenta', 'estado', 'monto', 'comprador'],
    tecnico:      ['id', 'loteId', 'fechaVenta', 'monto', 'tipoPago'],
    inmobiliaria: ['id', 'loteId', 'fechaVenta', 'estado', 'monto'],
  },

  widthFor(id) {
    switch (id) {
      case 'id':             return '80px';
      case 'loteId':         return '100px';
      case 'fechaVenta':     return '120px';
      case 'estado':         return '140px';
      case 'monto':          return '120px';
      case 'comprador':      return '220px';
      case 'inmobiliaria':   return '180px';
      case 'tipoPago':       return '150px';
      case 'plazoEscritura': return '140px';
      case 'observaciones':  return 'minmax(200px, 300px)';
      default:               return 'minmax(120px, 1fr)';
    }
  },

  // makeColumns recibe helpers con { cells, fmt }, pero aquí evitamos depender de getters
  makeColumns({ cells = {}, fmt = {} } = {}) {
    const estadoBadge = cells.estadoBadge;
    const money = fmt.fmtMoney || fmtMoney;

    return [
      {
        id: 'id',
        titulo: 'ID',
        accessor: (v) => v.id ?? v.ventaId ?? '—',
        align: 'center',
      },
      {
        id: 'loteId',
        titulo: 'ID Lote',
        accessor: (v) => v.lotId ?? v.loteId ?? '—',
        align: 'center',
      },
      {
        id: 'fechaVenta',
        titulo: 'Fecha Venta',
        accessor: (v) => {
          const fecha = v.fechaVenta ?? v.date;
          if (!fecha) return '—';
          return new Date(fecha).toLocaleDateString('es-AR');
        },
        align: 'center',
      },
      {
        id: 'estado',
        titulo: 'Estado',
        accessor: (v) => estadoBadge?.(v.estado ?? v.status) ?? (fmtEstado(v.estado ?? v.status) || '—'),
        align: 'center',
      },
      {
        id: 'monto',
        titulo: 'Monto',
        accessor: (v) => money(v.monto ?? v.amount),
        align: 'right',
      },
      {
        id: 'comprador',
        titulo: 'Comprador',
        accessor: (v) => {
          // DEBUG: inspeccionar qué viene realmente
          console.debug('[Ventas][comprador]', { id: v?.id, comprador: v?.comprador });

          // 1) Objeto embebido típico
          const n = v?.comprador?.nombre && String(v.comprador.nombre).trim();
          const a = v?.comprador?.apellido && String(v.comprador.apellido).trim();
          const full = [n, a].filter(Boolean).join(' ').trim();
          if (full) return full;

          // 2) Campos planos/precomputados (por si el join se hace afuera)
          if (typeof v?.compradorNombreCompleto === 'string' && v.compradorNombreCompleto.trim()) {
            return v.compradorNombreCompleto.trim();
          }
          if (typeof v?.compradorNombre === 'string' && v.compradorNombre.trim()) {
            return v.compradorNombre.trim();
          }

          // 3) Si el backend mandó el comprador como string directo
          if (typeof v?.comprador === 'string' && v.comprador.trim()) {
            return v.comprador.trim();
          }

          // 4) Sin dato legible
          return '—';
        },
        align: 'center',
      },
      {
        // Inmobiliaria: hasta que el back envíe { inmobiliaria: { nombre } }, no mostramos el id.
        id: 'inmobiliaria',
        titulo: 'Inmobiliaria',
        accessor: (v) => {
          const embedded = v?.inmobiliaria?.nombre || v?.inmobiliaria?.razonSocial;
          if (embedded && String(embedded).trim()) return String(embedded).trim();

          // Adicional: si viene en plano
          if (typeof v?.inmobiliariaNombre === 'string' && v.inmobiliariaNombre.trim()) {
            return v.inmobiliariaNombre.trim();
          }
          if (typeof v?.inmobiliaria === 'string' && v.inmobiliaria.trim()) {
            return v.inmobiliaria.trim();
          }

          // Regla de negocio pedida: si no hay asociada → "La Federala"
          return 'La Federala';
        },
        align: 'center',
      },
      {
        id: 'tipoPago',
        titulo: 'Tipo Pago',
        accessor: (v) => v.tipoPago ?? v.paymentType ?? '—',
        align: 'center',
      },
      {
        id: 'plazoEscritura',
        titulo: 'Plazo Escritura',
        accessor: (v) => {
          const fecha = v.plazoEscritura;
          if (!fecha) return '—';
          return new Date(fecha).toLocaleDateString('es-AR');
        },
        align: 'center',
      },
      {
        id: 'observaciones',
        titulo: 'Observaciones',
        accessor: (v) => v.observaciones ?? '—',
        align: 'left',
      },
    ];
  },
};
