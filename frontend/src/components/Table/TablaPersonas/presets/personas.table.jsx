import { fmtNombreCompleto, fmtIdentificador, fmtContacto, fmtFecha, fmtEstadoPersona } from '../utils/formatters';

// Helper para parsear contacto (email/teléfono desde string contacto)
const parseContacto = (contacto) => {
  if (!contacto) return { email: null, telefono: null };
  const emailMatch = contacto.match(/^[^\s@]+@[^\s@]+\.[^\s@]+/);
  const email = emailMatch ? emailMatch[0] : null;
  const phoneMatch = contacto.match(/\d+/g);
  const telefono = phoneMatch ? parseInt(phoneMatch.join('')) : null;
  return { email, telefono };
};

// Helper para parsear contacto ya está arriba, fmtEstadoPersona viene de formatters

const columns = [
  // NO incluir columna ID
  {
    id: 'nombreCompleto',
    header: 'Nombre Completo',
    accessor: (row) => fmtNombreCompleto(row),
    width: 220,
    sortable: true,
    align: 'center',
  },
  {
    id: 'identificador',
    header: 'Identificador',
    accessor: (row) => fmtIdentificador(row),
    width: 200,
    sortable: true,
    align: 'center',
  },
  {
    id: 'contacto',
    header: 'Contacto',
    accessor: (row) => {
      const { email, telefono } = parseContacto(row.contacto);
      return fmtContacto(email || row.email, telefono || row.telefono);
    },
    width: 200,
    sortable: false,
    align: 'center',
  },
  {
    id: 'inmobiliaria',
    header: 'Cliente de',
    accessor: (row) => row.inmobiliaria?.nombre || 'La Federala',
    width: 180,
    sortable: true,
    align: 'center',
  },
  {
    id: 'createdAt',
    header: 'Fecha Creación',
    accessor: (row) => fmtFecha(row.createdAt),
    width: 150,
    sortable: true,
    align: 'center',
  },
  {
    id: 'estado',
    header: 'Estado',
    accessor: (row) => fmtEstadoPersona(row.estado),
    width: 120,
    sortable: true,
    align: 'center',
    // Esta columna solo se mostrará para Admin/Gestor (se filtra en TablaPersonas)
  }
];

// Columnas por defecto visibles (sin ID, sin estado por defecto)
const DEFAULT_VISIBLE_IDS = ['nombreCompleto', 'identificador', 'contacto', 'inmobiliaria', 'createdAt'];

export const personasTablePreset = {
  columns,
  defaultVisibleIds: DEFAULT_VISIBLE_IDS,
  widthFor(id) {
    const col = columns.find((c) => c.id === id);
    if (col?.width) {
      return typeof col.width === 'number' ? `${col.width}px` : col.width;
    }
    return 'minmax(120px, 1fr)';
  },
};
