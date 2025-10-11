// components/FilterBar/FilterBarPersonas.jsx
// Wrapper específico para personas que usa FilterBarBase genérico

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { personasFilterFields, personasFilterDefaults, personasCatalogs } from "./presets/personas.preset";
import { personasChipsFrom, nice } from "./utils/personasChips";

export default function FilterBarPersonas({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  // Configuración de campos para personas
  const fields = useMemo(() => [
    {
      id: 'q',
      type: 'search',
      label: 'Búsqueda',
      placeholder: 'Nombre, apellido, email...',
      defaultValue: ''
    },
    {
      id: 'tipoIdentificador',
      type: 'singleSelect',
      label: 'Tipo de Identificador',
      defaultValue: ''
    },
    {
      id: 'fechaCreacion',
      type: 'dateRange',
      label: 'Fecha de Creación',
      defaultValue: { min: null, max: null }
    }
  ], []);

  // Catálogos para los campos select
  const catalogs = useMemo(() => ({
    tipoIdentificador: [
      { value: '', label: 'Todos' },
      { value: 'DNI', label: 'DNI' },
      { value: 'CUIT', label: 'CUIT' },
      { value: 'CUIL', label: 'CUIL' },
      { value: 'Pasaporte', label: 'Pasaporte' }
    ]
  }), []);

  // Configuración de vistas (sin RBAC complejo por ahora)
  const viewsConfig = useMemo(() => ({
    isInmo: false, // Por ahora no hay restricciones de inmobiliaria en personas
    sanitizeForRole: (filters) => filters // Sin sanitización por ahora
  }), []);

  // Valores por defecto
  const defaults = useMemo(() => ({
    q: '',
    tipoIdentificador: '',
    fechaCreacion: { min: null, max: null }
  }), []);

  return (
    <FilterBarBase
      variant={variant}
      userRole={userRole}
      fields={fields}
      catalogs={catalogs}
      defaults={defaults}
      viewsConfig={viewsConfig}
      onParamsChange={onParamsChange}
      chipsFrom={personasChipsFrom}
      nice={nice}
    />
  );
}