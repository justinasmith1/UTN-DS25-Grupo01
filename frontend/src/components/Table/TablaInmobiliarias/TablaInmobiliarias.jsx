// src/components/TablaInmobiliarias/TablaInmobiliarias.jsx
// Wrapper de la tabla de inmobiliarias que usa TablaBase

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ListTodo, Percent } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../../../lib/auth/rbac";
import { canEditByEstadoOperativo } from "../../../utils/estadoOperativo";
import TablaBase from "../TablaBase";
import StatusBadge from "./cells/StatusBadge";
import { inmobiliariasTablePreset } from "./presets/inmobiliarias.table";
import { fmtComxVenta, fmtCantidadVentas, fmtFecha, fmtContacto } from "./utils/formatters";
import "./TablaInmobiliarias.css";

// Componente dropdown para "Ver asociadas" (ventas y reservas)
function VerAsociadasDropdown({ inmobiliariaId, inmobiliariaNombre, navigate }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVerVentas = () => {
    navigate(`/ventas?inmobiliariaId=${inmobiliariaId}`);
    setOpen(false);
  };

  const handleVerReservas = () => {
    navigate(`/reservas?inmobiliariaId=${inmobiliariaId}`);
    setOpen(false);
  };

  const handleVerPrioridades = () => {
    navigate(`/prioridades?inmobiliariaId=${inmobiliariaId}`);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        className="tl-icon tl-icon--money"
        aria-label="Ver asociadas"
        data-tooltip="Ver asociadas"
        onClick={() => setOpen(!open)}
        style={{ position: "relative" }}
      >
        <ListTodo size={18} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: btnRef.current ? `${btnRef.current.getBoundingClientRect().bottom + 4}px` : "auto",
            right: btnRef.current ? `${window.innerWidth - btnRef.current.getBoundingClientRect().right}px` : "auto",
            background: "#fff",
            border: "1px solid rgba(0,0,0,.14)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,.15)",
            zIndex: 99999,
            minWidth: "200px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={handleVerPrioridades}
            style={{
              width: "100%",
              padding: "10px 14px",
              textAlign: "left",
              background: "transparent",
              border: "none",
              borderTop: "1px solid #e5e7eb",
              cursor: "pointer",
              fontSize: "14px",
              color: "#111827",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Ver prioridades asociadas
          </button>
          
          <button
            type="button"
            onClick={handleVerReservas}
            style={{
              width: "100%",
              padding: "10px 14px",
              textAlign: "left",
              background: "transparent",
              border: "none",
              borderTop: "1px solid #e5e7eb",
              cursor: "pointer",
              fontSize: "14px",
              color: "#111827",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Ver reservas asociadas
          </button>

          <button
            type="button"
            onClick={handleVerVentas}
            style={{
              width: "100%",
              padding: "10px 14px",
              textAlign: "left",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#111827",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Ver ventas asociadas
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

export default function TablaInmobiliarias({
  data = [],
  loading = false,
  onAgregarInmobiliaria,
  onEditarInmobiliaria,
  onEliminarInmobiliaria,
  onReactivarInmobiliaria,
  onVerInmobiliaria,
  onAplicarBonificacion,
  selectedRows = [],
  onSelectionChange,
  ...tablaProps
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // -----------------------------------------
  // Columnas: 
  // -----------------------------------------
  const columns = useMemo(() => {
    return inmobiliariasTablePreset.columns.map((col) => {
      if (col.id === 'estado') {
        return {
          ...col,
          accessor: (row) => (
            <StatusBadge value={row.estado} type="estado" />
          ),
        };
      }
      if (col.id === 'nombre') {
        return {
          ...col,
          accessor: (row) => {
            // El nombre se muestra igual para operativas y eliminadas
            // La diferencia se indica con el badge de estado, no con el estilo del nombre
            return (
              <span style={{
                display: 'inline-block',
                maxWidth: '100%',
                lineHeight: '1.2',
                wordBreak: 'break-word',
                hyphens: 'auto',
              }}>
                {row.nombre || '-'}
              </span>
            );
          },
        };
      }
      if (col.id === 'fechaBaja') {
        return {
          ...col,
          accessor: (row) => {
            if (!row.fechaBaja) return '—';
            // Usamos tu formatter existente fmtFecha y añadimos color rojo suave
            return (
              <span style={{ color: '#ef4444', fontSize: '0.9em' }}>
                {fmtFecha(row.fechaBaja)}
              </span>
            );
          }
        }
      }

      return col;
    });
  }, []);

  // Columnas visibles por defecto - ahora incluye prioridadesActivas, excluye fechaBaja
  const defaultVisibleIds = useMemo(() => [
    'nombre',
    'estado',
    'razonSocial',
    'comxventa',
    'contacto',
    'prioridadesActivas',
  ], []);


  // -----------------------------------------
  // Acciones por fila (íconos):
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

      if (can(user, PERMISSIONS.AGENCY_EDIT) && canEditByEstadoOperativo(row)) {
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

      // Unifique la acción de "ver asociadas" en un solo botón con un tipo dropdown, que permite elegir entre ver las ventas o las reservas asociadas
      // a esta inmobiliaria. Cada opción navega al módulo correspondiente aplicando el filtro por inmobiliaria.
      if (can(user, PERMISSIONS.SALE_VIEW) || can(user, PERMISSIONS.RES_VIEW) || can(user, PERMISSIONS.PRIORITY_VIEW)) {
        actions.push(
          <VerAsociadasDropdown
            key="ver-asociadas"
            inmobiliariaId={row.id}
            inmobiliariaNombre={row.nombre}
            navigate={navigate}
          />
        );
      }

      // Mostrar botón de eliminar O reactivar según el estado
      if (row.estado === 'ELIMINADO') {
        // Inmobiliaria eliminada: mostrar botón de REACTIVAR
        if (can(user, PERMISSIONS.AGENCY_EDIT) && onReactivarInmobiliaria) {
          actions.push(
            <button
              key="reactivate"
              className="tl-icon tl-icon--success"
              aria-label="Reactivar Inmobiliaria"
              data-tooltip="Reactivar Inmobiliaria"
              onClick={() => onReactivarInmobiliaria?.(row)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </button>
          );
        }
      } else {
        // Inmobiliaria activa: mostrar botón de ELIMINAR (desactivar)
        if (can(user, PERMISSIONS.AGENCY_DELETE) && onEliminarInmobiliaria) {
          actions.push(
            <button
              key="delete"
              className="tl-icon tl-icon--delete"
              aria-label="Desactivar Inmobiliaria"
              data-tooltip="Desactivar Inmobiliaria"
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
      }

      return actions.length > 0 ? actions : null;
    },
    [user, onVerInmobiliaria, onEditarInmobiliaria, onEliminarInmobiliaria, onReactivarInmobiliaria, navigate]
  );

  // -----------------------------------------
  // Acciones de la barra superior
  // - "Aplicar bonificación" (siempre visible, pero deshabilitado si no hay selección)
  // - "+ Agregar Inmobiliaria" igual
  // -----------------------------------------
  const topActions = useMemo(() => {
    const actions = [];

    // Aplicar bonificación
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
        {/* Icono sutil para sugerir “bonificación” (porcentaje). */}
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

  // Función para obtener el ancho de las columnas
  const widthFor = useCallback((id) => {
    const col = config.columns.find((c) => c.id === id);
    if (col?.width) {
      return typeof col.width === 'number' ? `${col.width}px` : col.width;
    }
    return '1fr';
  }, [config.columns]);

  return (
    <div className="tabla-inmobiliarias">
      <TablaBase
        {...tablaProps}
        rows={data}
        columns={config.columns}
        widthFor={widthFor}
        renderRowActions={config.renderRowActions}
        toolbarRight={config.topActions}
        selected={selectedRows}
        onSelectedChange={onSelectionChange}
        selectable={config.selectable}
        rowKey="id"
        defaultVisibleIds={defaultVisibleIds}
        maxVisible={6}
      />
    </div>
  );
}
