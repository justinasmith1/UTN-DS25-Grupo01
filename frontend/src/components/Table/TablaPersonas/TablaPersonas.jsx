import React, { useMemo, useCallback } from 'react';
import { Eye, Edit, Trash2, UserPlus } from 'lucide-react';
import TablaBase from '../TablaBase';
import { personasTablePreset } from './presets/personas.table';
import { useAuth } from '../../../app/providers/AuthProvider';
import { can } from '../../../lib/auth/rbac';

const TablaPersonas = ({
  personas = [],
  loading = false,
  onVerPersona,
  onEditarPersona,
  onEliminarPersona,
  onAgregarPersona,
  selectedIds = [],
  onSelectedChange,
  className = '',
  userRole
}) => {
  const { user } = useAuth();
  const effectiveUserRole = userRole || (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  
  // Determinar columnas visibles por defecto (sin ID, estado solo Admin/Gestor)
  const defaultVisibleIds = useMemo(() => {
    const base = personasTablePreset.defaultVisibleIds || [];
    // Agregar estado solo si es Admin/Gestor
    if (effectiveUserRole === 'ADMINISTRADOR' || effectiveUserRole === 'GESTOR') {
      return [...base, 'estado'];
    }
    return base;
  }, [effectiveUserRole]);
  
  // Filtrar columnas disponibles según rol (estado solo Admin/Gestor)
  const availableColumns = useMemo(() => {
    if (effectiveUserRole === 'ADMINISTRADOR' || effectiveUserRole === 'GESTOR') {
      return personasTablePreset.columns;
    }
    // Para otros roles, excluir columna estado
    return personasTablePreset.columns.filter(col => col.id !== 'estado');
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
    
    if (can(user, 'personas.edit') && onEditarPersona) {
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
      actions.push(
        <button
          key="delete"
          className="tl-icon tl-icon--delete"
          aria-label="Eliminar persona"
          data-tooltip="Eliminar persona"
          onClick={() => onEliminarPersona(persona)}
        >
          <Trash2 size={18} />
        </button>
      );
    }
    
    return actions.length > 0 ? actions : null;
  }, [user, onVerPersona, onEditarPersona, onEliminarPersona]);

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
          className="tl-btn tl-btn--primary"
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
