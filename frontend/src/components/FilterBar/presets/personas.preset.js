// ===================
// Preset de filtros para Personas
// ===================

// Catálogos para filtros
export const TIPOS_IDENTIFICADOR = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CUIT', label: 'CUIT' },
  { value: 'CUIL', label: 'CUIL' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' }
];

export const ESTADOS_PERSONA = [
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'ELIMINADO', label: 'Eliminado' }
];

export const CLIENTE_DE_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'FEDERALA', label: 'La Federala' },
  { value: 'INMOBILIARIA', label: 'Inmobiliaria específica' }
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
    id: 'estado',
    label: 'Estado',
    type: 'select',
    options: ESTADOS_PERSONA,
    width: 'col-md-6',
    visibleForRoles: ['ADMINISTRADOR', 'GESTOR'] // Solo Admin/Gestor
  },
  {
    id: 'clienteDe',
    label: 'Cliente de',
    type: 'select',
    options: CLIENTE_DE_OPTIONS,
    width: 'col-md-6',
    visibleForRoles: ['ADMINISTRADOR', 'GESTOR'] // Solo Admin/Gestor
  },
  {
    id: 'inmobiliariaId',
    label: 'Inmobiliaria',
    type: 'select',
    options: [], // Se poblará dinámicamente
    width: 'col-md-6',
    visibleForRoles: ['ADMINISTRADOR', 'GESTOR'], // Solo Admin/Gestor
    dependsOn: 'clienteDe', // Solo visible si clienteDe === 'INMOBILIARIA'
    dependsOnValue: 'INMOBILIARIA'
  },
  {
    id: 'identificadorTipo',
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
  estado: 'OPERATIVO', // Por defecto mostrar solo operativas
  clienteDe: 'ALL', // Sin filtro por defecto (Todos)
  identificadorTipo: 'ALL',
  fechaCreacion: { min: null, max: null }
};

// Catálogos para el FilterBar
export const personasCatalogs = {
  TIPOS_IDENTIFICADOR,
  ESTADOS_PERSONA,
  CLIENTE_DE_OPTIONS
};
