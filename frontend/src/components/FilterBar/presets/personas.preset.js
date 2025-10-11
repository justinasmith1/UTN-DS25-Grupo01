// ===================
// Preset de filtros para Personas
// ===================

// Catálogos para filtros
export const TIPOS_IDENTIFICADOR = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CUIT', label: 'CUIT' },
  { value: 'CUIL', label: 'CUIL' },
  { value: 'Pasaporte', label: 'Pasaporte' }
];

// Configuración de campos de filtro
export const personasFilterFields = [
  {
    id: 'q',
    label: 'Búsqueda general',
    type: 'text',
    placeholder: 'Buscar por nombre, apellido, identificador, email o teléfono...',
    width: 'col-12'
  },
  {
    id: 'tipoIdentificador',
    label: 'Tipo de Identificador',
    type: 'select',
    options: TIPOS_IDENTIFICADOR,
    width: 'col-md-6'
  },
  {
    id: 'fechaCreacion',
    label: 'Fecha de Creación',
    type: 'dateRange',
    width: 'col-md-6'
  }
];

// Valores por defecto
export const personasFilterDefaults = {
  q: '',
  tipoIdentificador: '',
  fechaCreacion: { min: '', max: '' }
};

// Catálogos para el FilterBar
export const personasCatalogs = {
  TIPOS_IDENTIFICADOR
};
