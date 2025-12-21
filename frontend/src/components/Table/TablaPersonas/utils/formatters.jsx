// ===================
// Formatters para Personas
// ===================

/**
 * Formatea el nombre completo de una persona (displayName)
 * Usa razonSocial si existe, sino nombre + apellido
 */
export const fmtNombreCompleto = (persona) => {
  // Acepta objeto persona o (nombre, apellido, razonSocial)
  let razonSocial, nombre, apellido;
  
  if (typeof persona === 'object' && persona !== null) {
    razonSocial = persona.razonSocial;
    nombre = persona.nombre;
    apellido = persona.apellido;
  } else {
    // Legacy: acepta (nombre, apellido) como parámetros separados
    nombre = persona;
    apellido = arguments[1];
    razonSocial = arguments[2];
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

/**
 * Formatea el identificador (DNI, CUIT, CUIL, Pasaporte)
 * Muestra [BADGE TIPO] + valor con colores profesionales
 */
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

/**
 * Formatea la información de contacto (email y teléfono)
 * Si ambos son null/empty, muestra "—"
 */
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
    return `${str.slice(0, 2)}-${str.slice(2, 6)}-${str.slice(6)}`;
  } else if (str.length === 11) {
    // Formato: 11234567890 -> 11-2345-67890
    return `${str.slice(0, 2)}-${str.slice(2, 6)}-${str.slice(6)}`;
  }
  return str;
};

/**
 * Formatea una fecha
 */
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

/**
 * Formatea el estado de contacto (si tiene email, teléfono, ambos o ninguno)
 */
export const fmtEstadoContacto = (email, telefono) => {
  const tieneEmail = !!email;
  const tieneTelefono = !!telefono;
  
  if (tieneEmail && tieneTelefono) {
    return <span className="badge bg-success">Completo</span>;
  } else if (tieneEmail || tieneTelefono) {
    return <span className="badge bg-warning">Parcial</span>;
  } else {
    return <span className="badge bg-danger">Sin contacto</span>;
  }
};

/**
 * Formatea el tipo de identificador con color
 */
export const fmtTipoIdentificador = (tipo) => {
  const tipos = {
    'DNI': { color: 'primary', icon: '🆔' },
    'CUIT': { color: 'success', icon: '🏢' },
    'CUIL': { color: 'info', icon: '👤' },
    'Pasaporte': { color: 'warning', icon: '📘' }
  };

  const config = tipos[tipo] || { color: 'secondary', icon: '📄' };

  return (
    <span className={`badge bg-${config.color}`}>
      {config.icon} {tipo}
    </span>
  );
};

/**
 * Formatea el valor del identificador con formato específico
 */
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

/**
 * Formatea el estado de persona (ACTIVA/INACTIVA)
 * Usa el mismo badge que Lotes (tl-badge)
 */
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
