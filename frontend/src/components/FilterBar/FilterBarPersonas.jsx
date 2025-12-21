// components/FilterBar/FilterBarPersonas.jsx
// Wrapper específico para personas que usa FilterBarBase genérico

import { useMemo, useState, useEffect } from "react";
import FilterBarBase from "./FilterBarBase";
import { ESTADOS_PERSONA, TIPOS_IDENTIFICADOR } from "./presets/personas.preset";
import { personasChipsFrom, nice } from "./utils/personasChips";
import { getAllInmobiliarias } from "../../lib/api/inmobiliarias";

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
      getAllInmobiliarias({ estado: "ACTIVA" })
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

  // Construir opciones unificadas de "Cliente de" (TODOS + LA FEDERALA + inmobiliarias)
  const clienteDeOptions = useMemo(() => {
    if (userRole !== "ADMINISTRADOR" && userRole !== "GESTOR") {
      return [];
    }
    
    const options = [
      { value: 'ALL', label: 'Todos' },
      { value: 'FEDERALA', label: 'La Federala' }
    ];
    
    // Agregar inmobiliarias dinámicamente, por si hay mas de 4 en algun momento cuando creemos alguna otra, funciona ya chequeado
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
      // Estado (solo Admin/Gestor)
      ...(isAdminOrGestor ? [{
        id: 'estado',
        type: 'singleSelect',
        label: 'Estado',
        defaultValue: 'ALL',
        options: ESTADOS_PERSONA
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
    estado: ESTADOS_PERSONA,
    clienteDe: clienteDeOptions, // Opciones unificadas (TODOS + La Federala + inmobiliarias)
    identificadorTipo: TIPOS_IDENTIFICADOR
  }), [clienteDeOptions]);

  // Configuración de vistas
  const viewsConfig = useMemo(() => ({
    isInmo: userRole === "INMOBILIARIA",
    sanitizeForRole: (filters) => {
      // Para INMOBILIARIA, remover filtros que no aplican
      if (userRole === "INMOBILIARIA") {
        const { estado, clienteDe, ...rest } = filters;
        return rest;
      }
      return filters;
    }
  }), [userRole]);

  // Valores por defecto según rol (sin filtros aplicados)
  const defaults = useMemo(() => {
    if (userRole === "ADMINISTRADOR" || userRole === "GESTOR") {
      return {
        q: '',
        estado: 'ALL', // Sin filtro por defecto
        clienteDe: [], // Array vacío para multiSelect
        identificadorTipo: [], // Array vacío para multiSelect
        fechaCreacion: { min: null, max: null }
      };
    } else {
      // INMOBILIARIA: sin estado ni clienteDe
      return {
        q: '',
        identificadorTipo: [], // Array vacío para multiSelect
        fechaCreacion: { min: null, max: null }
      };
    }
  }, [userRole]);

  return (
    <FilterBarBase
      variant={variant}
      userRole={userRole}
      fields={fields}
      catalogs={catalogs}
      defaults={defaults}
      viewsConfig={viewsConfig}
      onParamsChange={onParamsChange}
      onSearchChange={onSearchChange} // Pasar callback de búsqueda separado
      chipsFormatter={personasChipsFrom}
      nice={nice}
      initialValue={initialValue}
    />
  );
}