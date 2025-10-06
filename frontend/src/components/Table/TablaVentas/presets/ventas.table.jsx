// src/components/TablaVentas/presets/ventas.table.jsx
import React from 'react';
import { fmtMoney, fmtEstado } from '../../TablaLotes/utils/formatters';

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
      case 'id':           return '80px';
      case 'loteId':       return '100px';
      case 'fechaVenta':   return '120px';
      case 'estado':       return '140px';
      case 'monto':        return '120px';
      case 'comprador':    return '200px';
      case 'inmobiliaria': return '180px';
      case 'tipoPago':     return '150px';
      case 'plazoEscritura': return '140px';
      case 'observaciones': return 'minmax(200px, 300px)';
      default:             return 'minmax(120px, 1fr)';
    }
  },

  makeColumns({ cells = {}, fmt = {}, getters = {} } = {}) {
    const estadoBadge = cells.estadoBadge;
    const fmtMoney = fmt.fmtMoney;
    const fmtEstado = fmt.fmtEstado;

    const getCompradorNombre = getters.getCompradorNombre;
    const getInmobiliariaNombre = getters.getInmobiliariaNombre;

    return [
      { 
        id: 'id', 
        titulo: 'ID', 
        accessor: (v) => v.id ?? v.ventaId ?? '—', 
        align: 'center' 
      },
      { 
        id: 'loteId', 
        titulo: 'ID Lote', 
        accessor: (v) => v.lotId ?? v.loteId ?? '—', 
        align: 'center' 
      },
      { 
        id: 'fechaVenta', 
        titulo: 'Fecha Venta', 
        accessor: (v) => {
          const fecha = v.date ?? v.fechaVenta;
          if (!fecha) return '—';
          return new Date(fecha).toLocaleDateString('es-AR');
        }, 
        align: 'center' 
      },
      { 
        id: 'estado', 
        titulo: 'Estado', 
        accessor: (v) => estadoBadge(v.status ?? v.estado), 
        align: 'center' 
      },
      { 
        id: 'monto', 
        titulo: 'Monto', 
        accessor: (v) => fmtMoney(v.amount ?? v.monto), 
        align: 'right' 
      },
      { 
        id: 'comprador', 
        titulo: 'Comprador', 
        accessor: (v) => getCompradorNombre(v), 
        align: 'center' 
      },
      { 
        id: 'inmobiliaria', 
        titulo: 'Inmobiliaria', 
        accessor: (v) => getInmobiliariaNombre(v), 
        align: 'center' 
      },
      { 
        id: 'tipoPago', 
        titulo: 'Tipo Pago', 
        accessor: (v) => v.paymentType ?? v.tipoPago ?? '—', 
        align: 'center' 
      },
      { 
        id: 'plazoEscritura', 
        titulo: 'Plazo Escritura', 
        accessor: (v) => {
          const fecha = v.plazoEscritura;
          if (!fecha) return '—';
          return new Date(fecha).toLocaleDateString('es-AR');
        }, 
        align: 'center' 
      },
      { 
        id: 'observaciones', 
        titulo: 'Observaciones', 
        accessor: (v) => v.observaciones ?? '—', 
        align: 'left' 
      },
    ];
  },
};
