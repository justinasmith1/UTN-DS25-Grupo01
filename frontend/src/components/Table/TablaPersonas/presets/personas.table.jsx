import { fmtNombreCompleto, fmtIdentificador, fmtContacto, fmtFecha } from '../utils/formatters';

const columns = [
  {
    id: 'id',
    header: 'ID',
    accessor: (row) => row.id,
    width: 80,
    sortable: true,
  },
  {
    id: 'nombreCompleto',
    header: 'Nombre Completo',
    accessor: (row) => fmtNombreCompleto(row.nombre, row.apellido),
    width: 220,
    sortable: true,
  },
  {
    id: 'identificador',
    header: 'Identificador',
    accessor: (row) => fmtIdentificador(row.identificador, row.cuil),
    width: 180,
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessor: (row) => row.email || '-',
    width: 220,
    sortable: true,
  },
  {
    id: 'telefono',
    header: 'Teléfono',
    accessor: (row) => row.telefono ? row.telefono.toString() : '-',
    width: 140,
    sortable: true,
  },
  {
    id: 'createdAt',
    header: 'Fecha Creación',
    accessor: (row) => fmtFecha(row.createdAt),
    width: 150,
    sortable: true,
  }
];

export const personasTablePreset = {
  columns,
  widthFor(id) {
    const col = columns.find((c) => c.id === id);
    if (col?.width) {
      return typeof col.width === 'number' ? `${col.width}px` : col.width;
    }
    return 'minmax(120px, 1fr)';
  },
};
