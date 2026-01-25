// frontend/src/components/Table/TablaPersonas/TablaPersonas.jsx
// Tablero de personas con columnas dinámicas según rol y acciones basadas en permisos

import React, { useMemo, useCallback } from 'react';
import { Eye, Edit, Trash2, RotateCcw, Users } from 'lucide-react';
import TablaBase from '../TablaBase';
import { personasTablePreset, getColumnsForRole, getDefaultVisibleIds } from './presets/personas.table';
import { useAuth } from '../../../app/providers/AuthProvider';
import { can } from '../../../lib/auth/rbac';
import { canEditByEstadoOperativo } from '../../../utils/estadoOperativo';
import './TablaPersonas.css';

const TablaPersonas = ({
  personas = [],
  loading = false,
  onVerPersona,
  onEditarPersona,
  onEliminarPersona,
  onEliminarDefinitivo,
  onAgregarPersona,
  onGrupoFamiliar,
  selectedIds = [],
  onSelectedChange,
  className = '',
  userRole
}) => {
  const { user } = useAuth();
  const effectiveUserRole = userRole || (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  
  // Determinar columnas visibles por defecto según rol
  const defaultVisibleIds = useMemo(() => {
    // Usar función que retorna columnas por defecto según rol
    let base = getDefaultVisibleIds(effectiveUserRole) || [];
    
    // Agregar estado e inmobiliaria en posiciones específicas solo si es Admin/Gestor
    if (effectiveUserRole === 'ADMINISTRADOR' || effectiveUserRole === 'GESTOR') {
      // Insertar 'estado' después de 'nombreCompleto' (posición 1)
      const nombreIndex = base.indexOf('nombreCompleto');
      if (nombreIndex !== -1) {
        base = [...base.slice(0, nombreIndex + 1), 'estado', ...base.slice(nombreIndex + 1)];
      } else {
        base = ['estado', ...base];
      }
      
      // Insertar 'inmobiliaria' (Cliente de) después de 'telefono'
      const telefonoIndex = base.indexOf('telefono');
      if (telefonoIndex !== -1 && !base.includes('inmobiliaria')) {
        base = [...base.slice(0, telefonoIndex + 1), 'inmobiliaria', ...base.slice(telefonoIndex + 1)];
      } else if (!base.includes('inmobiliaria')) {
        // Si no hay telefono, insertar después de identificador
        const identificadorIndex = base.indexOf('identificador');
        if (identificadorIndex !== -1) {
          base = [...base.slice(0, identificadorIndex + 1), 'inmobiliaria', ...base.slice(identificadorIndex + 1)];
        } else {
          base.push('inmobiliaria');
        }
      }
    }
    // INMOBILIARIA: ya tiene teléfono y mail por defecto, no incluir estado ni inmobiliaria
    return base;
  }, [effectiveUserRole]);
  
  // Filtrar columnas disponibles según rol (estado e inmobiliaria solo Admin/Gestor)
  const availableColumns = useMemo(() => {
    return getColumnsForRole(effectiveUserRole);
  }, [effectiveUserRole]);

  // Función para renderizar acciones de fila
  const renderRowActions = useCallback((persona) => {
    const actions = [];
    
    if (can(user, 'personas.view') && onVerPersona) {
      actions.push(
        <button
          key="view"
          className="tl-icon tl-icon--view"
          aria-label="Ver persona"
          data-tooltip="Ver persona"
          onClick={() => onVerPersona(persona)}
        >
          <Eye size={18} />
        </button>
      );
    }
    
    if (can(user, 'personas.edit') && onEditarPersona && canEditByEstadoOperativo(persona)) {
      actions.push(
        <button
          key="edit"
          className="tl-icon tl-icon--edit"
          aria-label="Editar persona"
          data-tooltip="Editar persona"
          onClick={() => onEditarPersona(persona)}
        >
          <Edit size={18} />
        </button>
      );
    }
    
    if (can(user, 'personas.delete') && onEliminarPersona) {
      // Si está activa: botón desactivar (basura roja)
      // Si está inactiva: botón reactivar (refresh verde)
      if (persona.estado === 'OPERATIVO') {
        actions.push(
          <button
            key="delete"
            className="tl-icon tl-icon--delete"
            aria-label="Desactivar persona"
            data-tooltip="Desactivar persona"
            onClick={() => onEliminarPersona(persona)}
          >
            <Trash2 size={18} />
          </button>
        );
      } else if (persona.estado === 'ELIMINADO') {
        actions.push(
          <button
            key="reactivate"
            className="tl-icon tl-icon--success"
            aria-label="Reactivar persona"
            data-tooltip="Reactivar persona"
            onClick={() => onEliminarPersona(persona)}
          >
            <RotateCcw size={18} strokeWidth={2} />
          </button>
        );
      }
    }
    
    // Botón "Grupo familiar" (solo para propietarios/inquilinos operativos)
    if (onGrupoFamiliar) {
      const esPropietario = (persona._count?.lotesPropios ?? 0) > 0;
      const esInquilino = (persona._count?.alquileres ?? 0) > 0 || persona.esInquilino === true;
      const esAplicable = esPropietario || esInquilino;
      const esMiembroFamiliar = persona.categoria === 'MIEMBRO_FAMILIAR';
      
      if (esAplicable && !esMiembroFamiliar) {
        actions.push(
          <button
            key="grupo-familiar"
            className="tl-icon tl-icon--view"
            style={{ background: '#D1FAE5', color: '#065F46' }}
            aria-label="Grupo familiar"
            data-tooltip="Grupo familiar"
            onClick={() => onGrupoFamiliar(persona)}
          >
            <Users size={18} />
          </button>
        );
      }
    }
    
    return actions.length > 0 ? actions : null;
  }, [user, effectiveUserRole, onVerPersona, onEditarPersona, onEliminarPersona, onEliminarDefinitivo, onGrupoFamiliar]);

  // Acciones de la barra superior
  const topActions = useMemo(() => {
    const actions = [];
    
    // Botón "Limpiar selección" (siempre visible, pero deshabilitado si no hay selección)
    actions.push(
      <button
        key="clear-selection"
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={!selectedIds || selectedIds.length === 0}
        onClick={() => onSelectedChange?.([])}
        title="Quitar selección"
      >
        Limpiar selección
      </button>
    );
    
    // Botón "Registrar Persona" (solo si tiene permisos)
    if (can(user, 'personas.create') && onAgregarPersona) {
      actions.push(
        <button
          key="add"
          type="button"
          className="tl-btn tl-btn--soft"
          onClick={onAgregarPersona}
          title="Registrar nueva persona"
        >
          + Registrar Persona
        </button>
      );
    }
    
    // Botón "Ver en mapa" (solo si hay selección)
    if (selectedIds.length > 0) {
      actions.push(
        <button
          key="map"
          type="button"
          className="tl-btn tl-btn--info"
          onClick={() => {
            // TODO: Implementar vista de mapa para personas seleccionadas
            console.log('Ver en mapa:', selectedIds);
          }}
          title="Ver personas seleccionadas en mapa"
        >
          Ver en mapa ({selectedIds.length})
        </button>
      );
    }
    
    return <div className="tl-actions-right">{actions}</div>;
  }, [user, onAgregarPersona, selectedIds, onSelectedChange]);

  return (
    <div className={`tabla-personas ${className}`}>
      <TablaBase
        rows={personas}
        columns={availableColumns}
        widthFor={personasTablePreset.widthFor}
        defaultVisibleIds={defaultVisibleIds}
        renderRowActions={renderRowActions}
        toolbarRight={topActions}
        selected={selectedIds}
        onSelectedChange={onSelectedChange}
        rowKey="id"
      />
    </div>
  );
};

export default TablaPersonas;
