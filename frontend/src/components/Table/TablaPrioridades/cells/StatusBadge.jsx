import React from 'react';

// Fallback de estilos inline (igual que Reservas)
const baseStyle = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
};

// Variantes de estado para prioridades
const variants = {
  success: { backgroundColor: '#E6F6EA', color: '#11633E', border: '1px solid #A7E3B8', paddingTop: '2.5px', paddingBottom: '2.5px' },
  info:    { backgroundColor: '#E6F0FA', color: '#0F3E9E', border: '1px solid #BBD1F6', paddingTop: '2.5px', paddingBottom: '2.5px' },
  danger:  { backgroundColor: '#FDECEC', color: '#8A0F0F', border: '1px solid #F5B5B5', paddingTop: '2.5px', paddingBottom: '2.5px' },
  muted:   { backgroundColor: '#F1F3F5', color: '#495057', border: '1px solid #DEE2E6', paddingTop: '2.5px', paddingBottom: '2.5px' },
};

// Formatea el texto ("ACTIVA" -> "Activa")
const humanize = (s) =>
  !s ? '—' : String(s).toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

// Mapeo de EstadoPrioridad
function pickVariant(estado) {
  switch (estado?.toUpperCase()) {
    case 'ACTIVA':
      return 'success';
    case 'FINALIZADA':
      return 'info';
    case 'CANCELADA':
      return 'danger';
    case 'EXPIRADA':
      return 'muted';
    default:
      return 'muted';
  }
}

export default function StatusBadge({ value }) {
  const estadoRaw = value || '';
  const label = humanize(estadoRaw);
  const variant = pickVariant(estadoRaw);

  return (
    <span
      className={`tl-badge tl-badge--${variant}`}
      style={{ ...baseStyle, ...variants[variant] }}
      title={label}
    >
      {label}
    </span>
  );
}
