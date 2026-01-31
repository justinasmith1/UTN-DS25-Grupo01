// src/components/Table/TablaPrioridades/presets/prioridades.table.jsx
import { getLoteIdFormatted } from '../../../Table/TablaLotes/utils/getters';

const getPrioridadNumero = (row) => {
  // Formato: "PRI-000001" o id si no hay numero
  if (row?.numero) return row.numero;
  if (row?.id != null) return `PRI-${String(row.id).padStart(6, '0')}`;
  return '—';
};

const getLoteDisplay = (row) => {
  if (row?.lote) {
    return getLoteIdFormatted(row.lote);
  }
  if (row?.loteId) {
    return `Lote ID: ${row.loteId}`;
  }
  return '—';
};

const getEstado = (row) => row?.estado ?? null;

const getOwner = (row) => {
  if (row?.ownerType === 'CCLF') return 'La Federala';
  if (row?.inmobiliaria?.nombre) return row.inmobiliaria.nombre;
  if (row?.inmobiliariaNombre) return row.inmobiliariaNombre;
  return '—';
};

const getFechaInicio = (row) => row?.fechaInicio ?? null;

const getFechaFin = (row) => row?.fechaFin ?? null;

const getCreatedAt = (row) => row?.createdAt ?? null;

export const prioridadesTablePreset = {
  columns: [
    {
      id: 'numero',
      titulo: 'N° Prioridad',
      accessor: (p) => getPrioridadNumero(p),
      width: '130px',
      align: 'center'
    },
    {
      id: 'lote',
      titulo: 'Lote',
      accessor: (p) => getLoteDisplay(p),
      width: '120px',
      align: 'center'
    },
    {
      id: 'estado',
      titulo: 'Estado',
      accessor: (p) => getEstado(p),
      width: '120px',
      align: 'center'
    },
    {
      id: 'owner',
      titulo: 'Inmobiliaria',
      accessor: (p) => getOwner(p),
      width: '180px',
      align: 'center'
    },
    {
      id: 'fechaInicio',
      titulo: 'Fecha Inicio',
      accessor: (p) => {
        const fecha = getFechaInicio(p);
        return fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—';
      },
      width: '120px',
      align: 'center'
    },
    {
      id: 'fechaFin',
      titulo: 'Vencimiento',
      accessor: (p) => {
        const fecha = getFechaFin(p);
        return fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—';
      },
      width: '120px',
      align: 'center'
    },
    {
      id: 'createdAt',
      titulo: 'Creado',
      accessor: (p) => {
        const fecha = getCreatedAt(p);
        return fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—';
      },
      width: '120px',
      align: 'center'
    },
  ],

  accessors: {
    numero: (p) => String(getPrioridadNumero(p) ?? ''),
    lote: (p) => String(getLoteDisplay(p) ?? ''),
    estado: (p) => String(getEstado(p) ?? ''),
    owner: (p) => String(getOwner(p) ?? ''),
    fechaInicio: (p) => {
      const fecha = getFechaInicio(p);
      return fecha ? new Date(fecha).getTime() : 0;
    },
    fechaFin: (p) => {
      const fecha = getFechaFin(p);
      return fecha ? new Date(fecha).getTime() : 0;
    },
    createdAt: (p) => {
      const fecha = getCreatedAt(p);
      return fecha ? new Date(fecha).getTime() : 0;
    },
  },

  widthFor: (id) => {
    const W = {
      numero: '130px',
      lote: '120px',
      estado: '140px',
      owner: '200px',
      fechaInicio: '140px',
      fechaFin: '140px',
      createdAt: '120px',
    };
    return W[id] || 'minmax(120px, 1fr)';
  },

  selectable: true,
  multiSelect: true,
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  defaultSortBy: 'fechaFin',
  defaultSortDir: 'asc',
};
