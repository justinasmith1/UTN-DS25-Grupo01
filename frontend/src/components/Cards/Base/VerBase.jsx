import React from "react";
import "./cards.css";

/**
 * Contenedor base de modales/cards.
 * - Oscurece el fondo
 * - Dibuja el card con header + body
 * - Acepta acciones en el header (por ej. botón Editar y Cerrar)
 */
export default function VerBase({
  title,
  onClose,
  headerActions, // ReactNode opcional a la derecha (ej. botón Editar)
  children,
}) {
  return (
    <div className="cclf-overlay" role="dialog" aria-modal="true">
      <div className="cclf-card">
        <div className="cclf-card__header">
          <h3 className="cclf-card__title">{title}</h3>

          <div className="cclf-card__actions">
            {headerActions}
            <button
              type="button"
              aria-label="Cerrar"
              className="cclf-btn-close"
              onClick={onClose}
            >
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        <div className="cclf-card__body">{children}</div>
      </div>
    </div>
  );
}
