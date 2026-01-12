// src/components/TablaInmobiliarias/inmobiliarias.table.jsx
// Preset de columnas para la tabla de inmobiliarias
// Dejamos de mostrar el ID interno en la tabla de inmobiliarias.
// El identificador visual pasa a ser el Nombre junto con otros datos.

export const inmobiliariasTablePreset = {
  columns: [
    {
      id: 'nombre',
      header: 'Nombre',
      accessor: (row) => row.nombre || '-',
      width: 240,
      sortable: true,
      align: 'center',
    },
    {
      id: 'estado',
      header: 'Estado',
      accessor: (row) => row.estado || 'OPERATIVO',
      width: 120,
      sortable: true,
      align: 'center',
    },
    {
      id: 'razonSocial',
      header: 'Razón Social',
      accessor: (row) => row.razonSocial || '-',
      width: 160,
      sortable: true,
      align: 'center',

    },
    // --- NUEVA COLUMNA: FECHA BAJA ---
    // Solo mostramos algo si existe fechaBaja
    {
      id: 'fechaBaja',
      header: 'Fecha Baja',
      accessor: (row) => row.fechaBaja || null,
      width: 140,
      sortable: true,
      align: 'center',

    },
    {
      id: 'comxventa',
      header: 'Comisión x Venta (%)',
      accessor: (row) => row.comxventa ? `${row.comxventa}%` : '-',
      width: 180,
      sortable: true,
      align: 'center',
    },
    {
      id: 'contacto',
      header: 'Contacto',
      accessor: (row) => row.contacto || '-',
      width: 160,
      sortable: true,
      align: 'center',
    },
    {
      id: 'cantidadVentas',
      header: 'Ventas Asociadas',
      accessor: (row) => row.cantidadVentas || 0,
      width: 150,
      sortable: true,
      align: 'center',
    },
    {
      id: 'cantidadReservas',
      header: 'Reservas asociadas',
      accessor: (row) => row.cantidadReservas || 0,
      width: 160,
      sortable: true,
      align: 'center',
    },
  ],

  // Configuración por defecto
  defaultSort: { field: 'nombre', direction: 'asc' },
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50],

  // Configuración de selección
  selectable: true,
  selectKey: 'id',

  // Configuración de acciones
  actions: {
    view: {
      label: 'Ver',
      icon: 'eye',
      variant: 'outline-primary',
      permission: 'AGENCY_VIEW'
    },
    edit: {
      label: 'Editar',
      icon: 'pencil',
      variant: 'outline-warning',
      permission: 'AGENCY_EDIT'
    },
    delete: {
      label: 'Eliminar',
      icon: 'trash',
      variant: 'outline-danger',
      permission: 'AGENCY_DELETE'
    },
    ventas: {
      label: 'Ver Ventas',
      icon: 'graph-up',
      variant: 'outline-info',
      permission: 'SALE_VIEW',
      action: 'navigate',
      path: '/ventas'
    }
  }
};
