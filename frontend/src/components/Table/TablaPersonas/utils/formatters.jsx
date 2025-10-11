// ===================
// Formatters para Personas
// ===================

/**
 * Formatea el nombre completo de una persona
 */
export const fmtNombreCompleto = (nombre, apellido) => {
  const nombreCompleto = `${nombre || ''} ${apellido || ''}`.trim();
  return (
    <span className="fw-medium">
      {nombreCompleto || 'Sin nombre'}
    </span>
  );
};

/**
 * Formatea el identificador (DNI, CUIT, CUIL, Pasaporte)
 */
export const fmtIdentificador = (tipo, valor) => {
  if (!tipo) {
    return <span className="text-muted">Sin identificador</span>;
  }

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'DNI': return 'primary';
      case 'CUIT': return 'success';
      case 'CUIL': return 'info';
      case 'Pasaporte': return 'warning';
      default: return 'secondary';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'DNI': return '🆔';
      case 'CUIT': return '🏢';
      case 'CUIL': return '👤';
      case 'Pasaporte': return '📘';
      default: return '📄';
    }
  };

  return (
    <div className="d-flex align-items-center gap-2">
      <span className="badge bg-light text-dark border">
        {getTipoIcon(tipo)} {tipo}
      </span>
      {valor && (
        <span className="font-monospace small">
          {valor}
        </span>
      )}
    </div>
  );
};

/**
 * Formatea la información de contacto (email y teléfono)
 */
export const fmtContacto = (email, telefono) => {
  if (!email && !telefono) {
    return <span className="text-muted">Sin contacto</span>;
  }

  return (
    <div className="d-flex flex-column gap-1">
      {email && (
        <div className="d-flex align-items-center gap-1">
          <span className="text-primary">📧</span>
          <span className="small text-truncate" style={{ maxWidth: '150px' }}>
            {email}
          </span>
        </div>
      )}
      {telefono && (
        <div className="d-flex align-items-center gap-1">
          <span className="text-success">📞</span>
          <span className="small font-monospace">
            {fmtTelefono(telefono)}
          </span>
        </div>
      )}
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
    case 'Pasaporte':
      // Pasaporte: mantener como está
      return valor.toUpperCase();
    default:
      return valor;
  }
  
  return valor;
};
