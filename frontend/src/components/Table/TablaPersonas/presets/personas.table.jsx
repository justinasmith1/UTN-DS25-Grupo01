// Archivo destinado a definir las columnas y presets para la tabla de Personas

import { fmtNombreCompleto, fmtIdentificador, fmtFecha, fmtEstadoPersona, fmtTelefonoIndividual, fmtEmailIndividual } from '../utils/formatters';

// Columnas base (siempre disponibles)
const baseColumns = [
  // NO ponemos el ID xq nunca se muestra
  {
    id: 'nombreCompleto',
    header: 'Nombre Completo',
    accessor: (row) => fmtNombreCompleto(row),
    width: 220,
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
    // Esta columna solo se muestra solo para Admin/Gestor
  },
  {
    id: 'identificador',
    header: 'Identificador',
    accessor: (row) => fmtIdentificador(row),
    width: 170,
    sortable: true,
    align: 'center',
  },
  {
    id: 'telefono',
    header: 'Teléfono',
    accessor: (row) => fmtTelefonoIndividual(row.telefono, row.contacto),
    width: 150,
    sortable: false,
    align: 'center',
  },
  {
    id: 'mail',
    header: 'Mail',
    accessor: (row) => fmtEmailIndividual(row.email, row.contacto),
    width: 200,
    sortable: false,
    align: 'center',
  },
  {
    id: 'inmobiliaria',
    header: 'Cliente de',
    accessor: (row) => row.inmobiliaria?.nombre || 'La Federala',
    width: 200,
    sortable: true,
    align: 'center',
    // Esta columna solo se muestra solo para Admin/Gestor
  },
  {
    id: 'createdAt',
    header: 'Fecha Creación',
    accessor: (row) => fmtFecha(row.createdAt),
    width: 150,
    sortable: true,
    align: 'center',
  },

  // Columnas opcionales, las otras que puede elegit el usuario
  {
    id: 'lotes',
    header: 'Lotes',
    accessor: (row) => row._count?.lotesPropios ?? 0,
    width: 100,
    sortable: true,
    align: 'center',
  },
  {
    id: 'reservas',
    header: 'Reservas',
    accessor: (row) => row._count?.Reserva ?? 0,
    width: 100,
    sortable: true,
    align: 'center',
  },
  {
    id: 'ventas',
    header: 'Ventas',
    accessor: (row) => row._count?.Venta ?? 0,
    width: 100,
    sortable: true,
    align: 'center',
  }
];

// Exportar función que filtra columnas según rol
export const getColumnsForRole = (userRole) => {
  const roleUpper = (userRole || '').toString().trim().toUpperCase();
  return baseColumns.filter(col => {
    // INMOBILIARIA: excluir "Cliente de" y "Estado"
    if (roleUpper === 'INMOBILIARIA') {
      return col.id !== 'inmobiliaria' && col.id !== 'estado';
    }
    // ADMIN/GESTOR: todas las columnas
    return true;
  });
};

const columns = baseColumns;

// Columnas por defecto visibles según rol
// Admin/Gestor: teléfono por defecto, mail disponible en picker
// Inmobiliaria: ambos teléfono y mail por defecto
export const getDefaultVisibleIds = (userRole) => {
  const roleUpper = (userRole || '').toString().trim().toUpperCase();
  
  if (roleUpper === 'INMOBILIARIA') {
    // Inmobiliaria: nombreCompleto, identificador, telefono, mail, createdAt
    return ['nombreCompleto', 'identificador', 'telefono', 'mail', 'createdAt'];
  } else {
    // Admin/Gestor: nombreCompleto, identificador, telefono, createdAt (estado e inmobiliaria se insertan después)
    return ['nombreCompleto', 'identificador', 'telefono', 'createdAt'];
  }
};

export const personasTablePreset = {
  columns,
  defaultVisibleIds: getDefaultVisibleIds(), // Por defecto sin rol (se ajusta en TablaPersonas.jsx)
  widthFor(id) {
    const col = columns.find((c) => c.id === id);
    if (col?.width) {
      return typeof col.width === 'number' ? `${col.width}px` : col.width;
    }
    return 'minmax(120px, 1fr)';
  },
};
