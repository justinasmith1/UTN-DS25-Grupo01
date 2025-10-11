// components/FilterBar/FilterBarBase.jsx
// Componente genérico base para filtros, similar a TablaBase.jsx

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import "./FilterBar.css";
import RangeControl from "./controls/RangeControl";
import DateRangeControl from "./controls/DateRangeControl";
import FilterViewsMenu from "./FilterViewsMenu";
import useDebouncedEffect from "./hooks/useDebouncedEffect";
import useModalSheet from "./hooks/useModalSheet";

const DEBOUNCE_MS = 250;

export default function FilterBarBase({
  // Configuración de campos dinámicos
  fields = [], // [{ id, type, label, options?, rangeConfig?, defaultValue }]
  
  // Configuración de catálogos
  catalogs = {}, // { [fieldId]: [options] }
  
  // Configuración de rangos
  ranges = {}, // { [fieldId]: { minLimit, maxLimit, step, unit } }
  
  // Valores por defecto
  defaults = {}, // { [fieldId]: defaultValue }
  
  // Callbacks
  onParamsChange,
  
  // Configuración de vistas
  viewsConfig = null, // { isInmo, variant, sanitizeForRole }
  
  // Formateador personalizado de chips
  chipsFormatter,
  
  // Formateador de opciones en el modal
  optionFormatter = {},
  
  // Estilo
  variant = "dashboard",
}) {
  // Helpers
  const getDefaultValueForType = (type) => {
    switch (type) {
      case 'search': return '';
      case 'multiSelect': return [];
      case 'range': return { min: null, max: null };
      case 'singleSelect': return null;
      default: return '';
    }
  };

  // Estado de UI
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Estado de filtros dinámicos basado en fields
  const [filterState, setFilterState] = useState(() => {
    const state = {};
    fields.forEach(field => {
      state[field.id] = defaults[field.id] ?? field.defaultValue ?? getDefaultValueForType(field.type);
    });
    return state;
  });
  
  // Estado de filtros aplicados (chips)
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...filterState }));

  // Llamar a onParamsChange con los valores por defecto al montar
  useEffect(() => {
    const defaultParams = {};
    fields.forEach(field => {
      defaultParams[field.id] = defaults[field.id] ?? field.defaultValue ?? getDefaultValueForType(field.type);
    });
    onParamsChange?.(defaultParams);
  }, []); // Solo ejecutar una vez al montar

  // Debounce de búsqueda (solo para búsqueda inmediata)
  const searchField = fields.find(f => f.type === 'search');
  const searchValue = searchField ? filterState[searchField.id] : '';
  
  useEffect(() => {
    if (!searchField) return;
    
    const timeoutId = setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, [searchField.id]: searchValue }));
      onParamsChange?.({ [searchField.id]: searchValue });
    }, DEBOUNCE_MS);
    
    return () => clearTimeout(timeoutId);
  }, [searchValue, searchField]);

  const toggle = (fieldId, value) => {
    const currentValue = filterState[fieldId];
    const field = fields.find(f => f.id === fieldId);
    
    if (field?.type === 'multiSelect') {
      const newValue = currentValue.includes(value) 
        ? currentValue.filter(v => v !== value)
        : [...currentValue, value];
      setFilterState(prev => ({ ...prev, [fieldId]: newValue }));
    } else if (field?.type === 'singleSelect') {
      const newValue = currentValue === value ? null : value;
      setFilterState(prev => ({ ...prev, [fieldId]: newValue }));
    }
  };

  const updateRange = useCallback((fieldId, range) => {
    setFilterState(prev => ({ ...prev, [fieldId]: range }));
  }, []);

  const resetField = (fieldId) => {
    const field = fields.find(f => f.id === fieldId);
    const defaultValue = defaults[fieldId] ?? field?.defaultValue ?? getDefaultValueForType(field?.type);
    
    // Actualizar tanto filterState como appliedFilters
    const newFilterState = { ...filterState, [fieldId]: defaultValue };
    const newAppliedFilters = { ...appliedFilters, [fieldId]: defaultValue };
    
    setFilterState(newFilterState);
    setAppliedFilters(newAppliedFilters);
    
    // Notificar al componente padre del cambio
    onParamsChange?.(newAppliedFilters);
  };

  // Aplicar / Limpiar
  const applyFilters = () => {
    let sanitizedState = { ...filterState };
    
    // Aplicar sanitización si está configurada
    if (viewsConfig?.sanitizeForRole) {
      sanitizedState = viewsConfig.sanitizeForRole(sanitizedState);
    }
    
    setAppliedFilters({ ...sanitizedState });
    onParamsChange?.(sanitizedState);
    setOpen(false);
  };

  const removeChip = (key, valueToRemove) => {
    const field = fields.find(f => f.id === key);
    if (!field) return;

    const newAppliedFilters = { ...appliedFilters };
    
    if (field.type === 'multiSelect' && Array.isArray(newAppliedFilters[key])) {
      // Para multiSelect, remover el valor específico
      newAppliedFilters[key] = newAppliedFilters[key].filter(v => v !== valueToRemove);
    } else if (field.type === 'singleSelect') {
      // Para singleSelect, resetear al valor por defecto
      newAppliedFilters[key] = defaults[key] ?? field.defaultValue ?? getDefaultValueForType(field.type);
    } else if (field.type === 'range') {
      // Para range, resetear a null
      newAppliedFilters[key] = { min: null, max: null };
    } else if (field.type === 'search') {
      // Para search, limpiar
      newAppliedFilters[key] = '';
    } else {
      // Para otros tipos, resetear al valor por defecto
      newAppliedFilters[key] = defaults[key] ?? field.defaultValue ?? getDefaultValueForType(field.type);
    }

    setAppliedFilters(newAppliedFilters);
    setFilterState(newAppliedFilters);
    onParamsChange?.(newAppliedFilters);
  };

  const clear = () => {
    const clearedState = {};
    fields.forEach(field => {
      clearedState[field.id] = defaults[field.id] ?? field.defaultValue ?? getDefaultValueForType(field.type);
    });
    setFilterState(clearedState);
    setAppliedFilters(clearedState);
    onParamsChange?.(clearedState);
  };

  // Generar chips
  const chips = useMemo(() => {
    console.log('🔍 Generando chips. appliedFilters:', appliedFilters);
    
    // Si hay un formateador personalizado, usarlo
    if (chipsFormatter) {
      const customChips = chipsFormatter(appliedFilters, catalogs);
      console.log('✅ Chips generados por formatter:', customChips);
      return customChips;
    }
    
    // Fallback a la lógica por defecto
    const result = fields
      .map(field => {
        const value = appliedFilters[field.id];
        console.log(`🔍 Campo ${field.id}:`, value);
        
        // Verificar si el valor está vacío según el tipo de campo
        let isEmpty = false;
        if (!value) {
          isEmpty = true;
        } else if (Array.isArray(value) && value.length === 0) {
          isEmpty = true;
        } else if ((field.type === 'range' || field.type === 'dateRange') && typeof value === 'object' && value !== null && value.min === null && value.max === null) {
          isEmpty = true;
        }
        
        if (isEmpty) {
          console.log(`🔍 Campo ${field.id} descartado (valor vacío)`);
          return null;
        }
        
        let label = '';
        if (field.type === 'multiSelect' && Array.isArray(value)) {
          label = `${field.label}: ${value.join(', ')}`;
        } else if (field.type === 'singleSelect') {
          label = `${field.label}: ${value}`;
        } else if ((field.type === 'range' || field.type === 'dateRange') && typeof value === 'object') {
          if (value.min !== null && value.max !== null) {
            label = `${field.label}: ${value.min} - ${value.max}`;
          } else if (value.min !== null) {
            label = `${field.label}: ≥ ${value.min}`;
          } else if (value.max !== null) {
            label = `${field.label}: ≤ ${value.max}`;
          }
        } else if (field.type === 'search' && value) {
          label = `${field.label}: "${value}"`;
        }
        
        console.log(`🔍 Campo ${field.id} generó chip:`, label);
        return label ? { id: field.id, label, value } : null;
      })
      .filter(Boolean);
    
    console.log('🔍 Chips generados:', result);
    return result;
  }, [appliedFilters, fields, chipsFormatter, catalogs]);

  // Modal
  const bodyRef = useRef(null);
  const topRef = useRef(null);
  useModalSheet(open, bodyRef, topRef);


  const modal = open && createPortal(
    <div
      className={`fb-modal fb-modal-${variant}`}
      role="dialog"
      aria-modal="true"
      aria-label="Filtros"
      onMouseDown={(e) => {
        // Solo cerrar si el clic empezó en el backdrop, no si se arrastró desde dentro
        if (e.target === e.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div className="fb-sheet" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="fb-sheet-header">
          <h3>Filtros</h3>
          <button className="fb-close" onClick={() => setOpen(false)} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="fb-sheet-body" ref={bodyRef}>
          <div className="fb-body-top" ref={topRef}>
            {fields.filter(field => field.type !== 'search' && field.type !== 'range').map(field => (
              <section key={field.id} className="fb-section">
                <div className="fb-sec-head">
                  <h4>{field.label}</h4>
                  {filterState[field.id] && 
                   (Array.isArray(filterState[field.id]) ? filterState[field.id].length > 0 : 
                    (typeof filterState[field.id] === 'object' ? (filterState[field.id].min || filterState[field.id].max) : 
                     filterState[field.id])) && 
                   <button className="fb-reset" onClick={() => resetField(field.id)}>Restablecer</button>
                  }
                </div>
                
                {/* Los campos de búsqueda no se renderizan en el modal */}
                
                {(field.type === 'multiSelect' || field.type === 'singleSelect') && (
                  <div className={field.useGrid ? "fb-options fb-grid" : "fb-options"}>
                    {(catalogs[field.id] || field.options || []).map((option) => {
                      // Extraer value y label del objeto option
                      const optionValue = option.value || option;
                      const optionLabel = option.label || option;
                      
                      // Usar el formateador si está disponible, sino mostrar la opción tal como está
                      const formattedOption = optionFormatter[field.id] ? optionFormatter[field.id](option) : optionLabel;
                      
                      return (
                        <button
                          key={optionValue}
                          className={`fb-pill ${field.type === 'multiSelect' 
                            ? filterState[field.id]?.includes(optionValue) ? "is-checked" : ""
                            : filterState[field.id] === optionValue ? "is-checked" : ""
                          }`}
                          aria-pressed={field.type === 'multiSelect' 
                            ? filterState[field.id]?.includes(optionValue) 
                            : filterState[field.id] === optionValue
                          }
                          onClick={() => toggle(field.id, optionValue)}
                        >
                          {formattedOption}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="fb-body-rest">
            {fields.filter(field => field.type === 'range' || field.type === 'dateRange').map(field => (
                <section key={field.id} className="fb-section">
                  <div className="fb-sec-head">
                    <h4>{field.label}</h4>
                    {filterState[field.id] && 
                     (filterState[field.id].min !== null || filterState[field.id].max !== null) && 
                     <button className="fb-reset" onClick={() => resetField(field.id)}>Restablecer</button>
                    }
                  </div>
                <div className="fb-range-block">
                  {field.type === 'dateRange' ? (
                    <DateRangeControl
                      value={filterState[field.id] || { min: null, max: null }}
                      onChange={(range) => updateRange(field.id, range)}
                      minLimit={ranges[field.id]?.minLimit}
                      maxLimit={ranges[field.id]?.maxLimit}
                      step={ranges[field.id]?.step}
                      unit={ranges[field.id]?.unit}
                    />
                  ) : (
                    <RangeControl
                      value={filterState[field.id] || { min: null, max: null }}
                      onChange={(range) => updateRange(field.id, range)}
                      minLimit={ranges[field.id]?.minLimit}
                      maxLimit={ranges[field.id]?.maxLimit}
                      step={ranges[field.id]?.step}
                      unit={ranges[field.id]?.unit}
                    />
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

          <div className="fb-sheet-footer is-green">
            <div className="fb-btn-group">
              <button className="fb-btn fb-btn--danger" onClick={clear}>Borrar todo</button>
              <button className="fb-btn fb-btn--primary" onClick={applyFilters}>Aplicar filtros</button>
            </div>
          </div>
        </div>
      </div>,
    document.body
  );

  return (
    <div className={`fb fb-${variant}`}>
      <div className="fb-row">
        {/* Búsqueda */}
        {searchField && (
          <div className={`fb-search ${searchFocused || filterState[searchField.id] ? "is-active" : ""}`}>
            <i className="bi bi-search" aria-hidden />
            <input
              type="search"
              placeholder={searchField.placeholder || `Buscar ${searchField.label.toLowerCase()}...`}
              value={filterState[searchField.id] || ''}
              onChange={(e) => setFilterState(prev => ({ ...prev, [searchField.id]: e.target.value }))}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
              aria-label="Buscar"
            />
          </div>
        )}

        {/* Botón Filtros */}
        <button className="fb-filters" onClick={() => setOpen(true)}>
          <i className="bi bi-sliders" />
          <span>Filtros</span>
          {chips.length > 0 && <span className="fb-badge">{chips.length}</span>}
        </button>

        {/* Botón Limpiar */}
        <button className="fb-filters fb-filters--clear" onClick={clear}>
          <i className="bi bi-trash" />
          <span>Limpiar</span>
        </button>

        {/* Botón Vistas */}
        {viewsConfig && (
          <FilterViewsMenu
            isInmo={viewsConfig.isInmo}
            currentDraft={filterState}
            onApply={(vf) => {
              let sanitizedState = { ...vf };
              if (viewsConfig.sanitizeForRole) {
                sanitizedState = viewsConfig.sanitizeForRole(sanitizedState);
              }
              setFilterState(sanitizedState);
              setAppliedFilters({ ...sanitizedState });
              onParamsChange?.(sanitizedState);
            }}
            variant="match-filters"
          />
        )}
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="fb-chips">
          {chips.map((chip) => (
            <button
              key={`${chip.k || chip.id}-${chip.v || chip.value}`}
              className="fb-chip"
              onClick={() => removeChip(chip.k || chip.id, chip.v || chip.value)}
            >
              {chip.label}
              <i className="bi bi-x" />
            </button>
          ))}
        </div>
      )}

      {modal}
    </div>
  );
}
