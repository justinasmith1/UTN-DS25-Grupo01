// src/components/TablaInmobiliarias/TablaInmobiliarias.jsx
// Wrapper de la tabla de inmobiliarias que usa TablaBase
// CAMBIOS:
// 1) Reemplazo del icono "Ver ventas" por ListTodo (lucide-react) para unificar iconografía.
// 2) Agrego botón "Aplicar bonificación (N)" con contador a la izquierda de "Limpiar selección".
//    - Llama a la callback opcional onAplicarBonificacion(selectedRows).
// 3) Refuerzo de metadatos de columnas (header + accessorKey cuando aplica) para evitar desfasajes
//    entre encabezados y celdas en algunos renderers de tablas (sin romper formato ni estilos).

import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ListTodo, Percent } from "lucide-react"; // (1) nuevo icono + icono decorativo opcional
import { useAuth } from "../../../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../../../lib/auth/rbac";
import TablaBase from "../TablaBase";
import { inmobiliariasTablePreset } from "./presets/inmobiliarias.table";
// (nota) Se importan formatters por si en el futuro formateamos desde acá
import {
  fmtComxVenta,
  fmtCantidadVentas,
  fmtFecha,
  fmtContacto,
} from "./utils/formatters";

export default function TablaInmobiliarias({
  data = [],
  loading = false,
  onAgregarInmobiliaria,
  onEditarInmobiliaria,
  onEliminarInmobiliaria,
  onVerInmobiliaria,
  // NUEVO: acción para el botón de bonificación (opcional y no breaking)
  onAplicarBonificacion,
  selectedRows = [],
  onSelectionChange,
  ...tablaProps
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // -----------------------------------------
  // Columnas: usar las del preset SIN remapear para evitar desfases de header/celdas.
  // (FIX visual mínimo y seguro: respetamos accessor/width/order definidos en el preset)
  // -----------------------------------------
  const columns = useMemo(() => inmobiliariasTablePreset.columns, []);

  // -----------------------------------------
  // Acciones por fila (íconos): solo cambio el de "ver ventas"
  // -----------------------------------------
  const renderRowActions = useCallback(
    (row) => {
      const actions = [];

      if (can(user, PERMISSIONS.AGENCY_VIEW)) {
        actions.push(
          <button
            key="view"
            className="tl-icon tl-icon--view"
            aria-label="Ver Inmobiliaria"
            data-tooltip="Ver Inmobiliaria"
            onClick={() => onVerInmobiliaria?.(row)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        );
      }

      if (can(user, PERMISSIONS.AGENCY_EDIT)) {
        actions.push(
          <button
            key="edit"
            className="tl-icon tl-icon--edit"
            aria-label="Editar Inmobiliaria"
            data-tooltip="Editar Inmobiliaria"
            onClick={() => onEditarInmobiliaria?.(row)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        );
      }

      if (can(user, PERMISSIONS.SALE_VIEW)) {
        // (1) CAMBIO DE ICONO: ahora ListTodo de lucide-react
        actions.push(
          <button
            key="ventas"
            className="tl-icon tl-icon--money"
            aria-label="Ver ventas de la Inmobiliaria"
            data-tooltip="Ver ventas de la Inmobiliaria"
            onClick={() => navigate(`/ventas?inmobiliariaId=${row.id}`)}
          >
            <ListTodo size={18} />
          </button>
        );
      }

      if (can(user, PERMISSIONS.AGENCY_DELETE)) {
        actions.push(
          <button
            key="delete"
            className="tl-icon tl-icon--delete"
            aria-label="Eliminar Inmobiliaria"
            data-tooltip="Eliminar Inmobiliaria"
            onClick={() => onEliminarInmobiliaria?.(row)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        );
      }

      return actions.length > 0 ? actions : null;
    },
    [user, onVerInmobiliaria, onEditarInmobiliaria, onEliminarInmobiliaria, navigate]
  );

  // -----------------------------------------
  // Acciones de la barra superior
  // - Agrego botón "Aplicar bonificación (N)" antes de "Limpiar selección"
  // - Mantengo "+ Agregar Inmobiliaria" igual
  // -----------------------------------------
  const topActions = useMemo(() => {
    const actions = [];

    // (2) NUEVO: Aplicar bonificación (replicando patrón de "Ver en Mapa")
    actions.push(
      <button
        key="apply-bonus"
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={!selectedRows || selectedRows.length === 0}
        onClick={() => {
          if (!selectedRows || selectedRows.length === 0) return;
          onAplicarBonificacion?.(selectedRows);
        }}
        title="Aplicar bonificación a seleccionados"
        aria-label="Aplicar bonificación"
      >
        {/* Icono sutil para sugerir “bonificación” (porcentaje). Si preferís sin icono, se quita */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Percent size={14} />
          <span>Aplicar bonificación</span>
          {/* Badge contador */}
          <span
            className="tl-badge"
            style={{
              display: "inline-block",
              minWidth: 22,
              height: 22,
              lineHeight: "22px",
              padding: "0 6px",
              fontSize: 12,
              borderRadius: 999,
              background: "var(--tl-muted, #e9ecef)",
            }}
          >
            {selectedRows?.length ?? 0}
          </span>
        </span>
      </button>
    );

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
          className="tl-btn tl-btn--soft"
          onClick={onAgregarInmobiliaria}
          title="Nueva inmobiliaria"
        >
          + Agregar Inmobiliaria
        </button>
      );
    }

    return <div className="tl-actions-right">{actions}</div>;
  }, [user, onAgregarInmobiliaria, selectedRows, onSelectionChange, onAplicarBonificacion]);

  // Configuración de la tabla
  const config = useMemo(
    () => ({
      ...inmobiliariasTablePreset,
      columns,
      renderRowActions,
      topActions,
      selectable: can(user, PERMISSIONS.AGENCY_VIEW), // Solo si puede ver
    }),
    [columns, renderRowActions, topActions, user]
  );

  // Debug logs
  console.log(
    "🏢 TablaInmobiliarias render - data length:",
    data.length,
    "loading:",
    loading,
    "config:",
    config
  );

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
