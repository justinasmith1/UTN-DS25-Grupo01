// src/components/TablaInmobiliarias/TablaInmobiliarias.jsx
// Wrapper de la tabla de inmobiliarias que usa TablaBase

import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../../../lib/auth/rbac";
import TablaBase from "../TablaBase";
import { inmobiliariasTablePreset } from "./presets/inmobiliarias.table";
import { fmtComxVenta, fmtCantidadVentas, fmtFecha, fmtContacto } from "./utils/formatters";

export default function TablaInmobiliarias({
  data = [],
  loading = false,
  onAgregarInmobiliaria,
  onEditarInmobiliaria,
  onEliminarInmobiliaria,
  onVerInmobiliaria,
  selectedRows = [],
  onSelectionChange,
  ...tablaProps
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Configuración de columnas con permisos
  const columns = useMemo(() => {
    return inmobiliariasTablePreset.columns.map(col => ({
      id: col.id,
      titulo: col.header,
      accessor: col.accessor,
      width: col.width,
      sortable: col.sortable,
      visible: true, // Por ahora todas visibles, se puede hacer dinámico
    }));
  }, []);

  // Función para renderizar acciones de fila
  const renderRowActions = useCallback((row) => {
    const actions = [];
    
    if (can(user, PERMISSIONS.AGENCY_VIEW)) {
      actions.push(
        <button
          key="view"
          className="tl-icon tl-icon--view"
          aria-label="Ver inmobiliaria"
          data-tooltip="Ver inmobiliaria"
          onClick={() => onVerInmobiliaria?.(row)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      );
    }
    
    if (can(user, PERMISSIONS.AGENCY_EDIT)) {
      actions.push(
        <button
          key="edit"
          className="tl-icon tl-icon--edit"
          aria-label="Editar inmobiliaria"
          data-tooltip="Editar inmobiliaria"
          onClick={() => onEditarInmobiliaria?.(row)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      );
    }
    
    if (can(user, PERMISSIONS.AGENCY_DELETE)) {
      actions.push(
        <button
          key="delete"
          className="tl-icon tl-icon--delete"
          aria-label="Eliminar inmobiliaria"
          data-tooltip="Eliminar inmobiliaria"
          onClick={() => onEliminarInmobiliaria?.(row)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      );
    }
    
    if (can(user, PERMISSIONS.SALE_VIEW)) {
      actions.push(
        <button
          key="ventas"
          className="tl-icon tl-icon--money"
          aria-label="Ver ventas de la inmobiliaria"
          data-tooltip="Ver ventas de la inmobiliaria"
          onClick={() => navigate(`/ventas?inmobiliariaId=${row.id}`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </button>
      );
    }
    
    return actions.length > 0 ? actions : null;
  }, [user, onVerInmobiliaria, onEditarInmobiliaria, onEliminarInmobiliaria, navigate]);

  // Acciones de la barra superior
  const topActions = useMemo(() => {
    const actions = [];
    
    // Botón "Limpiar selección" (siempre visible, pero deshabilitado si no hay selección)
    actions.push(
      <button
        key="clear-selection"
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={!selectedRows || selectedRows.length === 0}
        onClick={() => onSelectionChange?.([])}
        title="Quitar selección"
      >
        Limpiar selección
      </button>
    );
    
    // Botón "Nueva Inmobiliaria" (solo si tiene permisos)
    if (can(user, PERMISSIONS.AGENCY_CREATE)) {
      actions.push(
        <button
          key="add"
          type="button"
          className="tl-btn tl-btn--primary"
          onClick={onAgregarInmobiliaria}
          title="Nueva inmobiliaria"
        >
          + Nueva Inmobiliaria
        </button>
      );
    }
    
    return <div className="tl-actions-right">{actions}</div>;
  }, [user, onAgregarInmobiliaria, selectedRows, onSelectionChange]);

  // Configuración de la tabla
  const config = useMemo(() => ({
    ...inmobiliariasTablePreset,
    columns,
    renderRowActions,
    topActions,
    selectable: can(user, PERMISSIONS.AGENCY_VIEW), // Solo si puede ver
  }), [columns, renderRowActions, topActions, user]);

  // Debug logs
  console.log('🏢 TablaInmobiliarias render - data length:', data.length, 'loading:', loading, 'config:', config);

  return (
    <TablaBase
      {...tablaProps}
      rows={data}
      columns={config.columns}
      renderRowActions={config.renderRowActions}
      toolbarRight={config.topActions}
      selected={selectedRows}
      onSelectedChange={onSelectionChange}
      selectable={config.selectable}
      rowKey="id"
    />
  );
}
