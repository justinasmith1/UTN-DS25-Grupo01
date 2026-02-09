// src/components/Table/TablaVentas/presets/ventas.table.jsx
import React from 'react';
import { fmtMoney, fmtEstado, fmtTipoPago} from '../utils/formatters';
import StatusBadge from '../cells/StatusBadge';
import { ESTADO_COBRO_LABELS, isVentaFinalizada } from '../../../../utils/ventaState';

// DEBUG: verificar que este preset sea el que usa la tabla de verdad
console.info('[Ventas][preset activo] ventas.table.jsx cargado');

export const ventasTablePreset = {
  key: 'ventas',

  COLUMN_TEMPLATES_BY_ROLE: {
    // Etapa 3: Columnas por defecto (sin comprador, +acciones implícitas)
    admin:        ['id', 'loteId', 'fechaVenta', 'estado', 'monto', 'inmobiliaria'],
    gestor:       ['id', 'loteId', 'fechaVenta', 'estado', 'monto', 'inmobiliaria'],
    tecnico:      ['id', 'loteId', 'fechaVenta', 'estado', 'monto'],
    inmobiliaria: ['id', 'loteId', 'fechaVenta', 'estado', 'monto'],
  },

  widthFor(id) {
    switch (id) {
      case 'id':                  return '120px'; // más ancho para ver el número completo en una sola fila
      case 'loteId':              return '100px';
      case 'fechaVenta':          return '120px';
      case 'estado':              return '140px';
      case 'monto':               return '120px';
      case 'comprador':           return '220px';
      case 'inmobiliaria':        return '180px';
      case 'estadoCobro':         return '140px'; // Etapa 3
      case 'tipoPago':            return '150px';
      case 'plazoEscritura':      return '140px';
      case 'fechaEscrituraReal':  return '140px'; // Etapa 3
      case 'fechaCancelacion':    return '140px'; // Etapa 3
      case 'observaciones':       return 'minmax(200px, 300px)';
      default:                    return 'minmax(120px, 1fr)';
    }
  },

  // makeColumns recibe helpers con { cells, fmt }, pero aquí evitamos depender de getters
  makeColumns({ cells = {}, fmt = {}, getters = {} } = {}) {
    const money = fmt.fmtMoney || fmtMoney;
    const getLoteMapId =
      getters?.getLoteMapId ||
      ((v) => v?.lote?.mapId ?? v?.lotMapId ?? v?.lote?.id ?? v?.loteId ?? '—');

    return [
      {
        id: 'id',
        titulo: 'ID',
        // Identificador visible para el usuario: usamos siempre `venta.numero`
        accessor: (v) => v.numero ?? '—',
        align: 'center',
      },
      {
        id: 'loteId',
        titulo: 'ID Lote',
        accessor: (v) => getLoteMapId(v) ?? '—',
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
        accessor: (v) => v.estado ?? v.status ?? '—',
        cell: ({ row }) => {
          const venta = row?.original;
          const estado = venta?.estado ?? venta?.status;
          const esFinalizada = isVentaFinalizada(venta);
          
          // Si está finalizada, mostrar SOLO el badge "FINALIZADA" (no ESCRITURADO + FINALIZADA)
          const estadoDisplay = esFinalizada ? 'FINALIZADA' : estado;
          
          return <StatusBadge value={estadoDisplay} />;
        },
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
          const n = v?.comprador?.nombre && String(v.comprador.nombre).trim();
          const a = v?.comprador?.apellido && String(v.comprador.apellido).trim();
          const full = [n, a].filter(Boolean).join(' ').trim();
          if (full) return full;

          if (typeof v?.compradorNombreCompleto === 'string' && v.compradorNombreCompleto.trim()) {
            return v.compradorNombreCompleto.trim();
          }
          if (typeof v?.compradorNombre === 'string' && v.compradorNombre.trim()) {
            return v.compradorNombre.trim();
          }
          if (typeof v?.comprador === 'string' && v.comprador.trim()) {
            return v.comprador.trim();
          }
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

          if (typeof v?.inmobiliariaNombre === 'string' && v.inmobiliariaNombre.trim()) {
            return v.inmobiliariaNombre.trim();
          }
          if (typeof v?.inmobiliaria === 'string' && v.inmobiliaria.trim()) {
            return v.inmobiliaria.trim();
          }
          return 'La Federala'; // fallback de negocio
        },
        align: 'center',
      },
      {
        id: 'tipoPago',
        titulo: 'Tipo Pago',
        accessor: (v) => fmtTipoPago(v.tipoPago ?? v.paymentType),
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
        // Etapa 3: Estado de Cobro (mismo diseño que StatusBadge)
        id: 'estadoCobro',
        titulo: 'Estado Cobro',
        accessor: (v) => v.estadoCobro ?? '—',
        cell: ({ row }) => {
          const estadoCobro = row?.original?.estadoCobro;
          if (!estadoCobro) return <span style={{ color: '#9CA3AF' }}>—</span>;
          
          const label = ESTADO_COBRO_LABELS[estadoCobro] || estadoCobro;
          
          // Mapeo de variantes (mismo que StatusBadge)
          const pickVariant = (estado) => {
            const s = String(estado || '').toUpperCase().trim();
            
            // Amarillo para PENDIENTE
            if (s === 'PENDIENTE') return 'warn';
            
            // Azul para EN_CURSO
            if (s === 'EN_CURSO') return 'info';
            
            // Verde para PAGO_COMPLETO
            if (s === 'PAGO_COMPLETO') return 'success';
            
            return 'muted';
          };
          
          const variant = pickVariant(estadoCobro);
          
          // Mismo estilo exacto que StatusBadge
          const baseStyle = {
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          };
          
          const variants = {
            success: { backgroundColor: '#E6F6EA', color: '#11633E', border: '1px solid #A7E3B8', paddingTop: '2.5px', paddingBottom: '2.5px'},
            info:    { backgroundColor: '#E6F0FA', color: '#0F3E9E', border: '1px solid #BBD1F6', paddingTop: '2.5px', paddingBottom: '2.5px' },
            warn:    { backgroundColor: '#FFF4E5', color: '#7A4B00', border: '1px solid #FFD8A8', paddingTop: '2.5px', paddingBottom: '2.5px' },
            danger:  { backgroundColor: '#FDECEC', color: '#8A0F0F', border: '1px solid #F5B5B5', paddingTop: '2.5px', paddingBottom: '2.5px' },
            purple:  { backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE', paddingTop: '2.5px', paddingBottom: '2.5px' },
            muted:   { backgroundColor: '#F1F3F5', color: '#495057', border: '1px solid #DEE2E6', paddingTop: '2.5px', paddingBottom: '2.5px' },
          };
          
          return (
            <span
              className={`tl-badge tl-badge--${variant}`}
              style={{ ...baseStyle, ...variants[variant] }}
              title={label}
            >
              {label}
            </span>
          );
        },
        align: 'center',
      },
      {
        // Etapa 3: Fecha Escritura Real
        id: 'fechaEscrituraReal',
        titulo: 'Fecha Escritura Real',
        accessor: (v) => {
          const fecha = v.fechaEscrituraReal;
          if (!fecha) return '—';
          return new Date(fecha).toLocaleDateString('es-AR');
        },
        align: 'center',
      },
      {
        // Etapa 3: Fecha Cancelación
        id: 'fechaCancelacion',
        titulo: 'Fecha Cancelación',
        accessor: (v) => {
          const fecha = v.fechaCancelacion;
          if (!fecha) return '—';
          return new Date(fecha).toLocaleDateString('es-AR');
        },
        align: 'center',
      },
    ];
  },
};
