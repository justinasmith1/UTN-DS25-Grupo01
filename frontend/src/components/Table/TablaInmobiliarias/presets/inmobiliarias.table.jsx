// src/components/TablaInmobiliarias/inmobiliarias.table.jsx
// Preset de columnas para la tabla de inmobiliarias

export const inmobiliariasTablePreset = {
  columns: [
    {
      id: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      width: 80,
      sortable: true,
    },
    {
      id: 'nombre',
      header: 'Nombre',
      accessor: (row) => row.nombre || '-',
      width: 200,
      sortable: true,
    },
    {
      id: 'razonSocial',
      header: 'Razón Social',
      accessor: (row) => row.razonSocial || '-',
      width: 200,
      sortable: true,
    },
    {
      id: 'comxventa',
      header: 'Comisión x Venta (%)',
      accessor: (row) => row.comxventa ? `${row.comxventa}%` : '-',
      width: 150,
      sortable: true,
    },
    {
      id: 'contacto',
      header: 'Contacto',
      accessor: (row) => row.contacto || '-',
      width: 200,
      sortable: true,
    },
    {
      id: 'cantidadVentas',
      header: 'Ventas Asociadas',
      accessor: (row) => row.cantidadVentas || 0,
      width: 150,
      sortable: true,
    },
    {
      id: 'createdAt',
      header: 'Fecha Creación',
      accessor: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-',
      width: 150,
      sortable: true,
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
