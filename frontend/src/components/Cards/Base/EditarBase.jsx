import "./cards.css";

/**
 * EditarBase (versión VerCard-style):
 * - Usa el MISMO contenedor que VentaVerCard: .cclf-overlay + .cclf-card
 * - Header igual al VerCard, SIN el botón "Editar Venta" (solo título + close)
 * - Footer abajo a la derecha con acciones (Cancelar, Restablecer?, Guardar cambios)
 */
export default function EditarBase({
  open,
  title,
  onCancel,
  onSave,
  onReset,         // opcional: restablecer cambios locales
  saving = false,  // deshabilita acciones durante el guardado
  children,
  headerRight,     // opcional (badge/estado)
  saveButtonText,  // opcional: texto personalizado del botón (por defecto "Guardar cambios")
}) {
  if (!open) return null;

  return (
    <div className="cclf-overlay" onClick={!saving ? onCancel : undefined}>
      <div
        className="cclf-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (idéntico a VerCard, sin el botón Editar) */}
        <div className="cclf-card__header">
          <h2 className="cclf-card__title">{title}</h2>

          <div className="cclf-card__actions">
            {headerRight}
            <button
              type="button"
              className="cclf-btn-close"
              onClick={onCancel}
              aria-label="Cerrar"
              disabled={saving}
            >
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        {/* Body + Footer (footer pegado abajo, alineado a la derecha) */}
        <div className="cclf-card__body">
          {children}

          <div className="cclf-footer">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onCancel}
              // Permitir cancelar incluso si está guardando para evitar que se trabe
            >
              Cancelar
            </button>

            {onReset && (
              <button
                className="btn btn-outline"
                type="button"
                onClick={onReset}
                disabled={saving}
              >
                Restablecer
              </button>
            )}

            {saveButtonText !== null && (
              <button
                className="btn btn-primary"
                type="button"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Guardando…" : (saveButtonText || "Guardar cambios")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
