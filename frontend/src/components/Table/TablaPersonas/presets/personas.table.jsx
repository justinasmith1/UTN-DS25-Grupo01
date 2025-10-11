import { fmtNombreCompleto, fmtIdentificador, fmtContacto, fmtFecha } from '../utils/formatters';

export const personasTablePreset = {
  columns: [
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
      width: 200,
      sortable: true,
    },
    {
      id: 'identificador',
      header: 'Identificador',
      accessor: (row) => fmtIdentificador(row.identificador, row.cuil),
      width: 150,
      sortable: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.email || '-',
      width: 200,
      sortable: true,
    },
    {
      id: 'telefono',
      header: 'Teléfono',
      accessor: (row) => row.telefono ? row.telefono.toString() : '-',
      width: 120,
      sortable: true,
    },
    {
      id: 'createdAt',
      header: 'Fecha Creación',
      accessor: (row) => fmtFecha(row.createdAt),
      width: 120,
      sortable: true,
    }
  ]
};
