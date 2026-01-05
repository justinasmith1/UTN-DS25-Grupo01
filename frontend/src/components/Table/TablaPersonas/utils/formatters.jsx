// ===================
// Formatters para Personas
// ===================

import { extractEmail, extractTelefono } from '../../../../utils/personaContacto';

/** Formatea el nombre completo de una persona (depende de que sea ), usa razonSocial si existe, sino nombre + apellido */
export const fmtNombreCompleto = (persona) => {
  // Acepta objeto persona o (nombre, apellido, razonSocial)
  let razonSocial, nombre, apellido;
  
  if (typeof persona === 'object' && persona !== null) {
    razonSocial = persona.razonSocial;
    nombre = persona.nombre;
    apellido = persona.apellido;
  } 

  const displayName = razonSocial 
    ? razonSocial 
    : `${nombre || ''} ${apellido || ''}`.trim();
  
  return (
    <span className="fw-medium">
      {displayName || '—'}
    </span>
  );
};

/** Formatea el identificador (DNI, CUIT, CUIL, Pasaporte) */
export const fmtIdentificador = (personaOrTipo, valor) => {
  // Acepta objeto persona o (tipo, valor) como parámetros separados
  let tipo, identificadorValor;
  
  if (typeof personaOrTipo === 'object' && personaOrTipo !== null) {
    tipo = personaOrTipo.identificadorTipo || personaOrTipo.identificador;
    identificadorValor = personaOrTipo.identificadorValor || personaOrTipo.cuil || '';
  } else {
    // Legacy: acepta (tipo, valor) como parámetros separados
    tipo = personaOrTipo;
    identificadorValor = valor || '';
  }
  
  if (!tipo) {
    return <span className="text-muted">—</span>;
  }

  if (!identificadorValor) {
    return <span className="text-muted">—</span>;
  }

  // Colores para badges según tipo
  const getBadgeVariant = (tipo) => {
    const tipoUpper = String(tipo).toUpperCase();
    if (tipoUpper === 'DNI') return 'info'; // azul
    if (tipoUpper === 'CUIL') return 'indigo'; // violeta
    if (tipoUpper === 'CUIT') return 'muted'; // gris
    if (tipoUpper === 'PASAPORTE' || tipoUpper === 'Pasaporte') return 'warn'; // amarillo
    return 'muted';
  };
  const minWidth = '125px'; // Suficiente para "CUIL 20123456789" o "CUIT 30123456789"

  return (
    <div className="d-flex align-items-center" style={{ justifyContent: 'center' }}>
      <span 
        className={`tl-badge tl-badge--${getBadgeVariant(tipo)}`}
        style={{ minWidth, textAlign: 'center', display: 'inline-block' }}
      >
        {tipo} {identificadorValor}
        </span>
    </div>
  );
};

/** Formatea la información de contacto (email y teléfono)
 * Si ambos son null/empty, muestra "—" */
export const fmtContacto = (email, telefono) => {
  if (!email && !telefono) {
    return <span className="text-muted">—</span>;
  }

  return (
    <div className="d-flex flex-column gap-1">
      {email ? (
        <div className="d-flex align-items-center gap-1">
          <span className="text-primary">📧</span>
          <span className="small text-truncate" style={{ maxWidth: '150px' }}>
            {email}
          </span>
        </div>
      ) : null}
      {telefono ? (
        <div className="d-flex align-items-center gap-1">
          <span className="text-success">📞</span>
          <span className="small font-monospace">
            {fmtTelefono(telefono)}
          </span>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Formatea un número de teléfono
 */
export const fmtTelefono = (telefono) => {
  if (!telefono) return '';
  
  const str = telefono.toString();
  if (str.length === 10) {
    // Formato: 1123456789 -> 11-2345-6789
    return `${str.slice(0, 3)}-${str.slice(3, 7)}-${str.slice(7)}`;
  } else if (str.length === 11) {
    // Formato: 11234567890 -> 11-2345-67890
    return `${str.slice(0, 3)}-${str.slice(3, 7)}-${str.slice(7)}`;
  }
  return str;
};

/** Formatea un teléfono individual */
export const fmtTelefonoIndividual = (telefono, contacto) => {
  const telefonoNum = extractTelefono(telefono, contacto);
  
  if (!telefonoNum) {
    return <span className="text-muted">Sin información</span>;
  }
  
  return (
    <span className="small font-monospace">
      {fmtTelefono(telefonoNum)}
    </span>
  );
};

/** Formatea un email individual */
export const fmtEmailIndividual = (email, contacto) => {
  const emailStr = extractEmail(email, contacto);
  
  if (!emailStr) {
    return <span className="text-muted">Sin información</span>;
  }
  
  return (
    <span className="small text-truncate" style={{ maxWidth: '200px', display: 'inline-block' }}>
      {emailStr}
    </span>
  );
};

/** Formatea una fecha */
export const fmtFecha = (fecha) => {
  if (!fecha) return <span className="text-muted">Sin fecha</span>;
  try {
    const date = new Date(fecha);
    return (
      <span className="small">
        {date.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })}
      </span>
    );
  } catch (error) {
    return <span className="text-muted">Fecha inválida</span>;
  }
};

/** Formatea el valor del identificador con formato específico */
export const fmtValorIdentificador = (tipo, valor) => {
  if (!valor) return '';

  switch (tipo) {
    case 'DNI':
      // DNI: 12345678 -> 12.345.678
      if (valor.length === 8) {
        return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5)}`;
      }
      break;
    case 'CUIT':
    case 'CUIL':
      // CUIT/CUIL: 20123456789 -> 20-12345678-9
      if (valor.length === 11) {
        return `${valor.slice(0, 2)}-${valor.slice(2, 10)}-${valor.slice(10)}`;
      }
      break;
    case 'PASAPORTE':
    case 'Pasaporte':
      // Pasaporte: mantener como está
      return valor.toUpperCase();
    default:
      return valor;
  }
  
  return valor;
};

/** Formatea el estado de persona (ACTIVA/INACTIVA), usa el mismo badge que usasmo para los Lotes */
export const fmtEstadoPersona = (estado) => {
  if (!estado) return <span className="text-muted">—</span>;
  
  // Usar el mismo estilo que StatusBadge de Lotes
  const variant = estado === 'ACTIVA' ? 'success' : 'danger';
  return (
    <span className={`tl-badge tl-badge--${variant}`}>
      {estado}
    </span>
  );
};
