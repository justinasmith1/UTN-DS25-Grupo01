// src/components/TablaLotes/presets/lotes.table.jsx
import React from 'react';

export const lotesTablePreset = {
  key: 'lotes',

  COLUMN_TEMPLATES_BY_ROLE: {
    admin:        ['id','estado','subestado','propietario','precio','deuda'],
    gestor:       ['id','estado','subestado','propietario','precio'],
    tecnico:      ['id','estado','subestado','frente','fondo','superficie'],
    inmobiliaria: ['id','estado','propietario','calle','precio'],
  },

  widthFor(id) {
    switch (id) {
      case 'id':         return '96px';
      case 'estado':     return '160px';
      case 'subestado':  return '170px';
      case 'propietario':return '220px';
      case 'calle':      return '220px';
      case 'descripcion':return 'minmax(280px,370px)';
      case 'numero':     return '120px';
      case 'superficie': return '120px';
      case 'frente':     return '120px';
      case 'fondo':      return '120px';
      case 'precio':     return '140px';
      case 'deuda':      return '140px';
      default:           return 'minmax(140px,1fr)';
    }
  },

  makeColumns({ cells = {}, fmt = {}, getters = {} } = {}) {
    const estadoBadge    = cells.estadoBadge;
    const subestadoBadge = cells.subestadoBadge;

    const fmtMoney = fmt.fmtMoney;
    const fmtM2    = fmt.fmtM2;
    const fmtM     = fmt.fmtM;

    const getPropietarioNombre = getters.getPropietarioNombre;
    const getCalle             = getters.getCalle;
    const getNumero            = getters.getNumero;

    return [
      { id: 'id',          titulo: 'ID',          accessor: (l) => l.id ?? l.idLote ?? l.codigo ?? '—', align: 'center' },
      { id: 'estado',      titulo: 'Estado',      accessor: (l) => estadoBadge(l.estado ?? l.status),          align: 'center' },
      { id: 'propietario', titulo: 'Propietario', accessor: (l) => getPropietarioNombre(l),                    align: 'center' },
      { id: 'calle',       titulo: 'Calle',       accessor: (l) => getCalle(l),                                align: 'center' },
      { id: 'numero',      titulo: 'Número',      accessor: (l) => getNumero(l),                               align: 'center' },
      { id: 'superficie',  titulo: 'Superficie',  accessor: (l) => fmtM2(l.superficie ?? l.metros ?? l.m2),    align: 'right'  },
      { id: 'frente',      titulo: 'Frente',      accessor: (l) => fmtM(l.frente),                             align: 'right'  },
      { id: 'fondo',       titulo: 'Fondo',       accessor: (l) => fmtM(l.fondo),                              align: 'right'  },
      { id: 'precio',      titulo: 'Precio',      accessor: (l) => fmtMoney(l.precio ?? l.price ?? l.precioUSD ?? l.priceUSD), align: 'center' },
      {
        id: 'deuda',
        titulo: 'Deuda',
        accessor: (l) =>
          l.deuda == null ? (
            <span className="tl-badge tl-badge--muted">N/D</span>
          ) : l.deuda ? (
            <span className="tl-badge tl-badge--danger">DEUDOR</span>
          ) : (
            <span className="tl-badge tl-badge--success">AL DÍA</span>
          ),
        align: 'center',
      },
      { id: 'subestado',   titulo: 'Subestado',   accessor: (l) => subestadoBadge(l.subestado ?? l.subStatus ?? l.estadoPlano), align: 'center' },
      { id: 'descripcion', titulo: 'Descripción', accessor: (l) => l.descripcion ?? '—',                       align: 'left'    },
    ];
  },
};
