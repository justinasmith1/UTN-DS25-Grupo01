// components/FilterBar/FilterBarPersonas.jsx
// Wrapper específico para personas que usa FilterBarBase genérico
// Sigue el patrón de Visibilidad (Operativas/Eliminadas) igual que Prioridades/Reservas/Ventas/Inmobiliarias

import { useMemo, useState, useEffect } from "react";
import FilterBarBase from "./FilterBarBase";
import { TIPOS_IDENTIFICADOR } from "./presets/personas.preset";
import { personasChipsFrom, nice } from "./utils/personasChips";
import { getAllInmobiliarias } from "../../lib/api/inmobiliarias";

// Opciones de visibilidad (consistentes con el resto de módulos)
const VISIBILIDAD_OPTIONS = [
  { value: 'OPERATIVO', label: 'Operativas' },
  { value: 'ELIMINADO', label: 'Eliminadas' }
];

export default function FilterBarPersonas({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
  onSearchChange, // Callback opcional para búsqueda (manejo separado)
  initialValue,
}) {
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [loadingInmobiliarias, setLoadingInmobiliarias] = useState(false);

  // Cargar inmobiliarias para el dropdown (solo Admin/Gestor)
  useEffect(() => {
    if (userRole === "ADMINISTRADOR" || userRole === "GESTOR") {
      setLoadingInmobiliarias(true);
      getAllInmobiliarias({ estado: "OPERATIVO" })
        .then((res) => {
          const inmobiliariasList = (res.data || []).map((inm) => ({
            value: inm.id,
            label: inm.nombre || inm.razonSocial || `Inmobiliaria ${inm.id}`
          }));
          setInmobiliarias(inmobiliariasList);
        })
        .catch((err) => {
          console.error("Error al cargar inmobiliarias:", err);
          setInmobiliarias([]);
        })
        .finally(() => {
          setLoadingInmobiliarias(false);
        });
    }
  }, [userRole]);

  // Construir opciones unificadas de "Cliente de" (LA FEDERALA + inmobiliarias)
  const clienteDeOptions = useMemo(() => {
    if (userRole !== "ADMINISTRADOR" && userRole !== "GESTOR") {
      return [];
    }
    
    const options = [
      { value: 'FEDERALA', label: 'La Federala' }
    ];
    
    // Agregar inmobiliarias dinámicamente
    inmobiliarias.forEach(inm => {
      options.push({
        value: inm.value,
        label: inm.label
      });
    });
    return options;
  }, [userRole, inmobiliarias]);

  // Configuración de campos para personas (filtrados por rol)
  const fields = useMemo(() => {
    const isAdminOrGestor = userRole === "ADMINISTRADOR" || userRole === "GESTOR";
    
    return [
      {
        id: 'q',
        type: 'search',
        label: 'Búsqueda',
        placeholder: 'Nombre, apellido, identificador...',
        defaultValue: ''
      },
      // Visibilidad (solo Admin/Gestor) - igual que otros módulos
      ...(isAdminOrGestor ? [{
        id: 'visibilidad',
        type: 'singleSelect',
        label: 'Visibilidad',
        defaultValue: 'OPERATIVO'
      }] : []),
      // Cliente de (solo Admin/Gestor) - unificado con inmobiliarias (multiSelect)
      ...(isAdminOrGestor ? [{
        id: 'clienteDe',
        type: 'multiSelect',
        label: 'Cliente de',
        defaultValue: [],
        options: clienteDeOptions,
        disabled: loadingInmobiliarias
      }] : []),
      // Tipo de identificador (todos) - multiSelect
      {
        id: 'identificadorTipo',
        type: 'multiSelect',
        label: 'Tipo de Identificador',
        defaultValue: [],
        options: TIPOS_IDENTIFICADOR
      },
      {
        id: 'fechaCreacion',
        type: 'dateRange',
        label: 'Fecha de Creación',
        defaultValue: { min: null, max: null }
      }
    ];
  }, [userRole, clienteDeOptions, loadingInmobiliarias]);

  // Catálogos para los campos select
  const catalogs = useMemo(() => ({
    visibilidad: VISIBILIDAD_OPTIONS,
    clienteDe: clienteDeOptions,
    identificadorTipo: TIPOS_IDENTIFICADOR
  }), [clienteDeOptions]);

  // Configuración de vistas
  const viewsConfig = useMemo(() => ({
    isInmo: userRole === "INMOBILIARIA",
    sanitizeForRole: (filters) => {
      // Para INMOBILIARIA, remover filtros que no aplican
      if (userRole === "INMOBILIARIA") {
        const { visibilidad, estado, clienteDe, ...rest } = filters;
        return rest;
      }
      return filters;
    }
  }), [userRole]);

  // Valores por defecto según rol
  const defaults = useMemo(() => {
    if (userRole === "ADMINISTRADOR" || userRole === "GESTOR") {
      return {
        q: '',
        visibilidad: 'OPERATIVO', // Por defecto mostrar solo operativas
        clienteDe: [],
        identificadorTipo: [],
        fechaCreacion: { min: null, max: null }
      };
    } else {
      // INMOBILIARIA: sin visibilidad ni clienteDe
      return {
        q: '',
        identificadorTipo: [],
        fechaCreacion: { min: null, max: null }
      };
    }
  }, [userRole]);

  // Formateador de opciones para visibilidad
  const optionFormatter = useMemo(() => ({
    visibilidad: (val) => val === 'OPERATIVO' ? 'Operativas' : val === 'ELIMINADO' ? 'Eliminadas' : val,
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
      onSearchChange={onSearchChange}
      chipsFormatter={personasChipsFrom}
      optionFormatter={optionFormatter}
      nice={nice}
      initialValue={initialValue}
    />
  );
}